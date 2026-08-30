export async function callBestModel(
  messages: { role: string; content: string }[],
  systemPrompt: string,
  selectedModel?: string,
): Promise<{ text: string; model: string; provider: string }> {
  const system = { role: 'system', content: systemPrompt };
  const allMessages = [system, ...messages];
  // LongCat (kilo free tier) is a reasoning model — tokens <400 get eaten by
  // reasoning and content comes back EMPTY. 500 keeps short prompts working.
  const MAX_TOKENS = 600;

  // ── PAID ROUTER (V12): respects the selected model. ──────────────────────
  // 1) If the caller picked a specific model, try it FIRST via the available
  //    gateways (kilocode direct, CF edge) so paid selection is honored —
  //    hostamar-* models are our proprietary SKU names served by the
  //    kilocode slot and REPORTED with provider "hostamar".
  // 2) Degradation only when the slot is genuinely unreachable — and the
  //    provider/model fields then report the ACTUAL model used, never silent.
  const wanted = selectedModel || '';
  const isHostamarModel = wanted.startsWith('hostamar-');

  type Res = { text: string; model: string; provider: string };
  const attempts: Array<() => Promise<Res>> = [];

  const kilocodeCall = (m: string) => async (): Promise<Res> => {
    if (!process.env.KILOCODE_API_KEY) throw new Error('no kilocode key');
    const base = process.env.KILOCODE_BASE_URL || 'https://api.kilo.ai/api/gateway';
    const r = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.KILOCODE_API_KEY}` },
      body: JSON.stringify({ model: m, messages: allMessages, temperature: 0.7, max_tokens: MAX_TOKENS }),
    });
    if (!r.ok) throw new Error(`kilocode ${r.status}`);
    const j: any = await r.json();
    const txt = j.choices?.[0]?.message?.content;
    if (!txt || txt.length < 5) throw new Error('empty');
    return { text: txt, model: m, provider: isHostamarModel ? 'hostamar' : 'kilocode' };
  };

  const edgeCall = (m: string) => async (): Promise<Res> => {
    const EDGE_URL = process.env.EDGE_GATEWAY_URL || 'https://hostamar-ai-gateway.romelraisul.workers.dev/v1';
    const key = process.env.EDGE_INTERNAL_KEY || 'hostamar-edge-internal-2026-xK39m';
    const r = await fetch(`${EDGE_URL}/chat/completions`, {
      method: 'POST',
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
    attempts.push(kilocodeCall(wanted));
    attempts.push(edgeCall(wanted));
  }

  // Capacity fallback order (reports the ACTUAL model used in the response)
  for (const m of ['kilo-auto/free', 'meituan/longcat-2.0-free']) {
    attempts.push(kilocodeCall(m));
    attempts.push(edgeCall(m));
  }

  for (const fn of attempts) {
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
    fallback = `bKash পেমেন্ট: আমাদের পার্সোনাল নম্বর 01822417463 তে Send Money করুন। Plans: Starter ৳599 (6000cr) / Pro ৳1,299 (13000cr) / Business ৳2,999 (30000cr) — 1cr = 1TK। তারপর TrxID টি https://hostamar.com/dashboard/payment এ সাবমিট করুন — আমরা ৫ মিনিটে Approve করব।`;
  } else if (lastUser.includes('storage') || lastUser.includes('স্টোরেজ') || lastUser.includes('upload') || lastUser.includes('file')) {
    fallback = `Storage B2: 5GB FREE — https://hostamar.com/dashboard/storage এ upload করুন। S3 endpoint s3.us-east-005.backblazeb2.com bucket hostamar-prod।`;
  } else if (lastUser.includes('tv') || lastUser.includes('channel') || lastUser.includes('চ্যানেল') || lastUser.includes('live')) {
    fallback = `TV: ৫০টি স্টেবল চ্যানেল — https://hostamar.com/tv — API /api/tv/stable-channels`;
  } else if (lastUser.includes('pricing') || lastUser.includes('price') || lastUser.includes('প্রাইস') || lastUser.includes('package')) {
    fallback = `Pricing: Starter ৳599 (6000cr), Pro ৳1,299 (13000cr), Business ৳2,999 (30000cr) — সাইনআপে 6000cr বোনাস — 1cr = 1TK — https://hostamar.com/pricing`;
  } else {
    fallback = `Hostamar Support: ৫০+ AI সার্ভিস, 120 মডেল চ্যাট, ব্রাউজার IDE, ক্লাউড হোস্টিং, TV ৫০ চ্যানেল — সাইনআপে 6000cr বোনাস (1cr = 1TK = 1 ভবিষ্যৎ HOST কয়েন)। কী জানতে চান?`;
  }
  return { text: fallback, model: 'knowledge-base-fallback', provider: 'fallback' };
}
