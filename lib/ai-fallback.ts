/**
 * lib/ai-fallback.ts — unlimited LLM chain with a WALL-CLOCK BUDGET (V26).
 *
 * V26 root-cause fix: /api/v1/chat/completions (maxDuration 55s) previously
 * allowed up to 8 sequential attempts × 30s timeouts — on a ~99k-token context
 * each attempt can take 12–30s+, two slow attempts stack past the function
 * limit → Vercel kills the function → 504 + empty stream (no finish_reason).
 *
 * Now: a deadline (default 42s, comfortably under maxDuration 55) bounds the
 * WHOLE chain. Each attempt's timeout is min(30s, remaining budget). When the
 * budget is spent, we fall straight to the knowledge-base completion so every
 * request returns a well-formed response — the function can never be killed
 * mid-flight by its own chain.
 *
 * V100 (agentic): when the caller sends `tools`, the OpenAI-compatible fields
 * (tools / tool_choice / parallel_tool_calls) ride every upstream body
 * verbatim, kilocode slots are tried first (kilo.ai gateway is
 * OpenAI-compatible and forwards tools to the underlying model), and an
 * upstream assistant message containing tool_calls is returned VERBATIM with
 * finish_reason "tool_calls" instead of being flattened into plain text.
 */
type FallbackTrace = { provider: string; status: string; error?: string; elapsedMs?: number };

export type ToolsPayload = {
  tools?: unknown;
  tool_choice?: unknown;
  parallel_tool_calls?: unknown;
  anonymous?: boolean;
};

export async function callBestModel(
  messages: { role: string; content: string }[],
  systemPrompt: string,
  selectedModel?: string,
  debug = false,
  toolsPayload?: ToolsPayload,
): Promise<{
  text: string;
  model: string;
  provider: string;
  message?: any;
  finish_reason?: string;
  trace?: FallbackTrace[];
}> {
  const system = { role: 'system', content: systemPrompt };
  const allMessages = [system, ...messages];
  const trace: FallbackTrace[] = [];

  // Context-size awareness: total payload chars → approx tokens (/4).
  // Small contexts keep MAX_TOKENS 600 (fast); huge contexts (Hermes-style
  // 398-msg histories) get more room so reasoning models don't burn the whole
  // budget thinking and return empty.
  const inputChars = allMessages.reduce((n, m) => n + (m.content?.length || 0), 0);
  const approxTokens = Math.ceil(inputChars / 4);
  let MAX_TOKENS = approxTokens > 20_000 ? 1200 : 600;
  // V100 guardrail: tools requests from ANONYMOUS callers stay freemium but
  // are capped at 600 completion tokens to bound capacity.
  if (toolsPayload?.tools && toolsPayload.anonymous) MAX_TOKENS = Math.min(MAX_TOKENS, 600);

  // ── V26 wall-clock budget ────────────────────────────────────────────────
  const CHAIN_BUDGET_MS = Number(process.env.AI_CHAIN_BUDGET_MS || 42_000);
  const PER_ATTEMPT_CAP_MS = 30_000;
  const chainStart = Date.now();
  const remainingMs = () => CHAIN_BUDGET_MS - (Date.now() - chainStart);
  const attemptTimeoutMs = () => Math.max(3_000, Math.min(PER_ATTEMPT_CAP_MS, remainingMs()));

  // ── PAID ROUTER (V12): respects the selected model. ──────────────────────
  // hostamar-* are OUR proprietary SKUs: compute rides the kilocode capacity
  // slots (free inference capacity we own), the response is BRANDED as the
  // selected hostamar model with provider 'hostamar' and billed at tier.
  const wanted = selectedModel || '';
  const isHostamarModel = wanted.startsWith('hostamar-');

  type Res = { text: string; model: string; provider: string; message?: any; finish_reason?: string };
  type Attempt = { name: string; fn: () => Promise<Res> };
  const attempts: Attempt[] = [];

  // V100: OpenAI tools passthrough — only attached when the caller actually
  // sent a tools array, so plain-chat upstream bodies stay byte-identical.
  const toolFields = toolsPayload?.tools
    ? {
        tools: toolsPayload.tools,
        ...(toolsPayload.tool_choice !== undefined ? { tool_choice: toolsPayload.tool_choice } : {}),
        ...(toolsPayload.parallel_tool_calls !== undefined
          ? { parallel_tool_calls: toolsPayload.parallel_tool_calls }
          : {}),
      }
    : {};

// ECHO 2026-09-14: cheap chain-of-thought detector — kilo-auto/free (and any
// future router swap) can emit reasoning INSIDE .content; that must never reach
// customers. Treat as empty so the fallback chain moves on.
function looksLikeCot(t: string): boolean {
  return /(?:^|\n)\s*(?:Let me|First[,:] ?|I need to|The user)(?:\b| is)/i.test(t.slice(0, 200));
}

  const kilocodeCall = (m: string) => async (): Promise<Res> => {
    if (!process.env.KILOCODE_API_KEY) throw new Error('no kilocode key');
    const base = process.env.KILOCODE_BASE_URL || 'https://api.kilo.ai/api/gateway';
    const r = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      // V26: attempt timeout capped by the remaining chain budget — never lets
      // one attempt consume time the function doesn't have.
      signal: AbortSignal.timeout(attemptTimeoutMs()),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.KILOCODE_API_KEY}` },
      // ECHO 2026-09-14 20:1x: kilo-auto/free is an AUTO-ROUTER that flipped to a
      // model emitting chain-of-thought IN .content (public COT_LEAK 19:5x).
      // thinking:disabled keeps content clean (verified vs api.kilo.ai 20:0x).
      body: JSON.stringify({ model: m, messages: allMessages, temperature: 0.7, max_tokens: MAX_TOKENS, thinking: { type: 'disabled' }, ...toolFields }),
    });
    if (!r.ok) throw new Error(`kilocode ${r.status}`);
    const j: any = await r.json();
    // V100: upstream answered with tool_calls → relay the message VERBATIM
    // (content may be null); never synthesize plain content over a tool call.
    const rawChoice = j.choices?.[0];
    if (rawChoice?.message?.tool_calls?.length) {
      return {
        text: '',
        model: m,
        provider: 'kilocode',
        message: rawChoice.message,
        finish_reason: rawChoice.finish_reason || 'tool_calls',
      };
    }
    // V36.47 FIX: qwen3.5 thinking models return reasoning in .reasoning not .content
    const choice = rawChoice?.message;
    // ECHO 2026-09-14 fix: reasoning-as-content leak — concise real answers ("4", "OK")
    // were discarded (length>4 gate) and raw chain-of-thought served to public callers.
    // Now: prefer content whenever non-empty/whitespace; reasoning only if content absent.
    const rawTxt = typeof choice?.content === 'string' ? choice.content.trim() : '';
    const rawReasoning = typeof choice?.reasoning === 'string' ? choice.reasoning.trim() : '';
    const txt = rawTxt || rawReasoning || null;
    if (!txt || (rawTxt && looksLikeCot(rawTxt))) throw new Error('empty');
    return { text: txt, model: m, provider: 'kilocode' };
  };

  const edgeCall = (m: string) => async (): Promise<Res> => {
    const EDGE_URL = process.env.EDGE_GATEWAY_URL || 'https://hostamar-ai-gateway.romelraisul.workers.dev/v1';
    const key = process.env.EDGE_INTERNAL_KEY || 'hostamar-edge-internal-2026-xK39m';
    const r = await fetch(`${EDGE_URL}/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(attemptTimeoutMs()),
      headers: { 'Content-Type': 'application/json', 'x-internal-key': String(key) },
      body: JSON.stringify({ model: m, messages: allMessages, temperature: 0.7, max_tokens: MAX_TOKENS, thinking: { type: 'disabled' }, ...toolFields }),
    });
    if (!r.ok) throw new Error(`edge ${r.status}`);
    const j: any = await r.json();
    // V100: same verbatim tool_calls relay as the kilocode path.
    const rawChoice = j.choices?.[0];
    if (rawChoice?.message?.tool_calls?.length) {
      return {
        text: '',
        model: m,
        provider: 'kilo-edge',
        message: rawChoice.message,
        finish_reason: rawChoice.finish_reason || 'tool_calls',
      };
    }
    const choice = rawChoice?.message;
    // ECHO 2026-09-14 fix: reasoning-as-content leak — concise real answers ("4", "OK")
    // were discarded (length>4 gate) and raw chain-of-thought served to public callers.
    // Now: prefer content whenever non-empty/whitespace; reasoning only if content absent.
    const rawTxt = typeof choice?.content === 'string' ? choice.content.trim() : '';
    const rawReasoning = typeof choice?.reasoning === 'string' ? choice.reasoning.trim() : '';
    const txt = rawTxt || rawReasoning || null;
    if (!txt || (rawTxt && looksLikeCot(rawTxt))) throw new Error('empty');
    return { text: txt, model: m, provider: 'kilo-edge' };
  };

  // PAID selection first — never silently swap the user's chosen model.
  if (wanted) {
    if (isHostamarModel) {
      // Proprietary SKU: ride BOTH capacity slots (kilo-auto + longcat) so a
      // single slot hiccup can't degrade the branded reply. Direct + edge per slot.
      for (const slot of ['kilo-auto/free', 'meituan/longcat-2.0-free']) {
        attempts.push({ name: `kilocode:${slot}`, fn: async () => {
          const r = await kilocodeCall(slot)();
          return { ...r, model: wanted, provider: wanted };
        }});
        attempts.push({ name: `edge:${slot}`, fn: async () => {
          const r = await edgeCall(slot)();
          return { ...r, model: wanted, provider: wanted };
        }});
      }
    } else {
      attempts.push({ name: `kilocode:${wanted}`, fn: kilocodeCall(wanted) });
      attempts.push({ name: `edge:${wanted}`, fn: edgeCall(wanted) });
    }
  }

  // Capacity fallback order (reports the ACTUAL model used in the response)
  for (const m of ['kilo-auto/free', 'meituan/longcat-2.0-free']) {
    attempts.push({ name: `kilocode:${m}`, fn: kilocodeCall(m) });
    attempts.push({ name: `edge:${m}`, fn: edgeCall(m) });
  }

  // V100: with tools in play, try the kilocode gateway slots FIRST — kilo.ai
  // is OpenAI-compatible and forwards tools to the underlying model. Plain
  // chat keeps the existing attempt interleave.
  const orderedAttempts = toolsPayload?.tools
    ? [
        ...attempts.filter((a) => a.name.startsWith('kilocode:')),
        ...attempts.filter((a) => !a.name.startsWith('kilocode:')),
      ]
    : attempts;

  for (const { name, fn } of orderedAttempts) {
    if (remainingMs() < 5_000) {
      trace.push({ provider: 'budget', status: 'exhausted', error: 'wall-clock budget spent' });
      break;
    }
    const t0 = Date.now();
    try {
      const res = await fn();
      // ECHO 2026-09-14 17:10: accept gate was `text.length > 10` — concise real answers
      // ("4", "OK", "yes") were marked 'empty' and the loop fell through to the canned
      // knowledge-base-fallback blurb. Accept any non-empty trimmed text; tool_calls
      // still accepted with empty text.
      if ((res.text && res.text.trim().length > 0) || res.finish_reason === 'tool_calls') {
        trace.push({ provider: name, status: 'ok', elapsedMs: Date.now() - t0 });
        if (debug) return { ...res, trace };
        return res;
      }
      trace.push({ provider: name, status: 'empty', elapsedMs: Date.now() - t0 });
    } catch (e) {
      trace.push({ provider: name, status: 'error', error: (e as Error).message, elapsedMs: Date.now() - t0 });
      continue;
    }
  }

  // 5. FINAL UNLIMITED FALLBACK
  const lastUser = messages[messages.length - 1]?.content?.toLowerCase() || '';
  let fallback = '';
  if (lastUser.includes('bkash') || lastUser.includes('বিকাশ') || lastUser.includes('payment') || lastUser.includes('পেমেন্ট') || lastUser.includes('trx')) {
    fallback = `bKash পেমেন্ট: আমাদের পার্সোনাল নাম্বার 01822417463 তে Send Money করুন। Plans: Starter ৳599 (6000cr) / Pro ৳1,299 (13000cr) / Business ৳2,999 (30000cr) — 1cr = 1TK। তারপর TrxID টি https://hostamar.com/dashboard/payment এ সাবমিট করুন — আমরা ৫ মিনিটে Approve করব।`;
  } else if (lastUser.includes('storage') || lastUser.includes('স্টোরেজ') || lastUser.includes('upload') || lastUser.includes('file')) {
    fallback = `Storage B2: 5GB FREE — https://hostamar.com/dashboard/storage এ upload করুন। S3 endpoint s3.us-east-005.backblazeb2.com bucket hostamar-prod।`;
  } else if (lastUser.includes('tv') || lastUser.includes('channel') || lastUser.includes('চ্যানেল') || lastUser.includes('live')) {
    fallback = `TV: ৫০টি স্টেবল চ্যানেল — https://hostamar.com/tv — API /api/tv/stable-channels`;
  } else if (lastUser.includes('pricing') || lastUser.includes('price') || lastUser.includes('প্রাইস') || lastUser.includes('package')) {
    fallback = `Pricing: Starter ৳599 (6000cr), Pro ৳1,299 (13000cr), Business ৳2,999 (30000cr) — সাইনআপে 6000cr বোনাস — 1cr = 1TK — https://hostamar.com/pricing`;
  } else {
    fallback = `Hostamar Support: ৫০+ AI সার্ভিস, 120 মডেল চ্যাট, ব্রাউজার IDE, ক্লাউড হোস্টিং, TV ৫০ চ্যানেল — সাইনআপে 6000cr বোনাস (1cr = 1TK = ১ ভবিষ্যৎ HOST কয়েন)। কী জানতে চান?`;
  }
  trace.push({ provider: 'knowledge-base', status: 'fallback', error: 'all-providers-failed' });
  return { text: fallback, model: 'knowledge-base-fallback', provider: 'fallback', trace };
}
