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
 */
export async function callBestModel(
  messages: { role: string; content: string }[],
  systemPrompt: string,
  selectedModel?: string,
): Promise<{ text: string; model: string; provider: string }> {
  const system = { role: 'system', content: systemPrompt };
  const allMessages = [system, ...messages];

  // Context-size awareness: total payload chars → approx tokens (/4).
  // Small contexts keep MAX_TOKENS 600 (fast); huge contexts (Hermes-style
  // 398-msg histories) get more room so reasoning models don't burn the whole
  // budget thinking and return empty.
  const inputChars = allMessages.reduce((n, m) => n + (m.content?.length || 0), 0);
  const approxTokens = Math.ceil(inputChars / 4);
  const MAX_TOKENS = approxTokens > 20_000 ? 1200 : 600;

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

  type Res = { text: string; model: string; provider: string };
  const attempts: Array<() => Promise<Res>> = [];

  const kilocodeCall = (m: string) => async (): Promise<Res> => {
    if (!process.env.KILOCODE_API_KEY) throw new Error('no kilocode key');
    const base = process.env.KILOCODE_BASE_URL || 'https://api.kilo.ai/api/gateway';
    const r = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      // V26: attempt timeout capped by the remaining chain budget — never lets
      // one attempt consume time the function doesn't have.
      signal: AbortSignal.timeout(attemptTimeoutMs()),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.KILOCODE_API_KEY}` },
      body: JSON.stringify({ model: m, messages: allMessages, temperature: 0.7, max_tokens: MAX_TOKENS }),
    });
    if (!r.ok) throw new Error(`kilocode ${r.status}`);
    const j: any = await r.json();
    const txt = j.choices?.[0]?.message?.content;
    if (!txt || txt.length < 5) throw new Error('empty');
    return { text: txt, model: m, provider: 'kilocode' };
  };

  const edgeCall = (m: string) => async (): Promise<Res> => {
    const EDGE_URL = process.env.EDGE_GATEWAY_URL || 'https://hostamar-ai-gateway.romelraisul.workers.dev/v1';
    const key = process.env.EDGE_INTERNAL_KEY || 'hostamar-edge-internal-2026-xK39m';
    const r = await fetch(`${EDGE_URL}/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(attemptTimeoutMs()),
      headers: { 'Content-Type': 'application/json', 'x-internal-key': String(key) },
      body: JSON.stringify({ model: m, messages: allMessages, temperature: 0.7, max_tokens: MAX_TOKENS }),
    });
    if (!r.ok) throw new Error(`edge ${r.status}`);
    const j: any = await r.json();
    const txt = j.choices?.[0]?.message?.content;
    if (!txt || txt.length < 5) throw new Error('empty');
    return { text: txt, model: m, provider: 'kilo-edge' };
  };

  // PAID selection first — never silently swap the user's chosen model.
  if (wanted) {
    if (isHostamarModel) {
      // Proprietary SKU: ride BOTH capacity slots (kilo-auto + longcat) so a
      // single slot hiccup can't degrade the branded reply. Direct + edge per slot.
      for (const slot of ['kilo-auto/free', 'meituan/longcat-2.0-free']) {
        attempts.push(async () => {
          const r = await kilocodeCall(slot)();
          return { text: r.text, model: wanted, provider: wanted };
        });
        attempts.push(async () => {
          const r = await edgeCall(slot)();
          return { text: r.text, model: wanted, provider: wanted };
        });
      }
    } else {
      attempts.push(kilocodeCall(wanted));
      attempts.push(edgeCall(wanted));
    }
  }

  // Capacity fallback order (reports the ACTUAL model used in the response)
  for (const m of ['kilo-auto/free', 'meituan/longcat-2.0-free']) {
    attempts.push(kilocodeCall(m));
    attempts.push(edgeCall(m));
  }

  for (const fn of attempts) {
    // V26: budget gate — if the wall-clock budget is nearly spent, stop
    // attempting and fall to the deterministic knowledge base. This is the
    // 504 fix: the function always finishes inside its own maxDuration.
    if (remainingMs() < 5_000) break;
    try {
      const res = await fn();
      if (res.text && res.text.length > 10) {
        console.log('ai-fallback success', res.provider, res.model);
        return res;
      }
    } catch { continue; }
  }

  // 5. FINAL UNLIMITED FALLBACK — knowledge base, no LLM needed, always works, Bangla+English
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
  return { text: fallback, model: 'knowledge-base-fallback', provider: 'fallback' };
}
