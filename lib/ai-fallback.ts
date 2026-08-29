export async function callBestModel(messages: {role:string,content:string}[], systemPrompt: string): Promise<{text:string, model:string, provider:string}> {
  const system = {role:'system',content:systemPrompt};
  const allMessages = [system, ...messages];
  // LongCat (kilo free tier) is a reasoning model — tokens <400 get eaten by
  // reasoning and content comes back EMPTY. 500 keeps short prompts working.
  const MAX_TOKENS = 600;

  // Chain order (2026-08-29 live-tested):
  // 1. Kilocode DIRECT (verified working free: kilo-auto/free + meituan/longcat-2.0-free)
  // 2. Cloudflare edge worker (kilo-edge, always-on)
  // 3. litellm on home VPS (only when computer on)
  // 4. OpenRouter free slugs (mostly retired 2026-08, kept for revival)
  // 5. knowledge-base Bangla fallback (always works, no LLM, no card)
  // NOTE: vercel ai-gateway + nvidia REMOVED (gateway needs card for all models;
  // nvidia free models hit EOL 2026-08-26 → 410 Gone).
  const chain: Array<() => Promise<{text:string, model:string, provider:string}>> = [
    // 1. Kilocode direct — works with API key, free models only
    async () => {
      if (!process.env.KILOCODE_API_KEY) throw new Error('no kilocode key');
      const base = process.env.KILOCODE_BASE_URL || 'https://api.kilo.ai/api/gateway';
      const models = ['kilo-auto/free', 'meituan/longcat-2.0-free'];
      for (const m of models) {
        try {
          const r = await fetch(`${base}/chat/completions`, {
            method:'POST',
            headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.KILOCODE_API_KEY}`},
            body: JSON.stringify({model:m, messages: allMessages, temperature:0.7, max_tokens: MAX_TOKENS})
          });
          if (!r.ok) continue;
          const j:any = await r.json();
          const txt = j.choices?.[0]?.message?.content;
          if (!txt || txt.length < 5) continue; // reasoning ate the budget
          return {text: txt, model: m, provider: 'kilocode'};
        } catch(e){ continue; }
      }
      throw new Error('kilocode all failed');
    },
    // 2. Cloudflare edge worker (always-on, proxies kilo) — x-internal-key header
    async () => {
      const EDGE_URL = process.env.EDGE_GATEWAY_URL || 'https://hostamar-ai-gateway.romelraisul.workers.dev/v1';
      const key = process.env.EDGE_INTERNAL_KEY || 'hostamar-edge-internal-2026-xK39m';
      const models = ['meituan/longcat-2.0-free', 'kilo-auto/free'];
      for (const m of models) {
        try {
          const r = await fetch(`${EDGE_URL}/chat/completions`, {
            method:'POST',
            headers:{'Content-Type':'application/json','x-internal-key': String(key)},
            body: JSON.stringify({model:m, messages: allMessages, temperature:0.7, max_tokens: MAX_TOKENS})
          });
          if (!r.ok) continue;
          const j:any = await r.json();
          const txt = j.choices?.[0]?.message?.content;
          if (!txt || txt.length < 5) continue;
          return {text: txt, model: m, provider: 'kilo-edge'};
        } catch(e){ continue; }
      }
      throw new Error('edge worker failed');
    },
    // 3. litellm proxy at http://litellm:4000/v1 - free models in home containers
    async () => {
      const litellmUrl = process.env.LITELLM_BASE_URL || 'http://litellm:4000/v1';
      const models = ['qwen3.8-max-free','llama-3.1-8b-instruct','kilo-auto','hy3-free','gpt-4o-mini','claude-3-haiku'];
      for (const m of models) {
        try {
          const r = await fetch(`${litellmUrl}/chat/completions`,{
            method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.LITELLM_API_KEY||'sk-1234'}`},
            body: JSON.stringify({model:m, messages: allMessages, temperature:0.7, max_tokens: MAX_TOKENS})
          });
          if (!r.ok) continue;
          const j:any = await r.json(); const txt = j.choices?.[0]?.message?.content; if (!txt || txt.length < 5) continue;
          return {text:txt, model:m, provider:'litellm'};
        } catch(e){ continue; }
      }
      throw new Error('litellm all failed');
    },
    // 4. OpenRouter free models (most :free retired Aug 2026 — kept for revival)
    async () => {
      if (!process.env.OPENROUTER_API_KEY) throw new Error('no openrouter');
      const models = ['meta-llama/llama-3.1-8b-instruct:free','qwen/qwen-2.5-7b-instruct:free','google/gemma-2-9b-it:free'];
      for (const m of models) {
        try {
          const r = await fetch('https://openrouter.ai/api/v1/chat/completions',{
            method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.OPENROUTER_API_KEY}`,'HTTP-Referer':'https://hostamar.com','X-Title':'Hostamar'},
            body: JSON.stringify({model:m, messages: allMessages, temperature:0.7, max_tokens: MAX_TOKENS})
          });
          if (!r.ok) continue;
          const j:any = await r.json(); const txt = j.choices?.[0]?.message?.content; if (!txt) continue;
          return {text: txt, model: m, provider: 'openrouter'};
        } catch(e){ continue; }
      }
      throw new Error('openrouter all failed');
    }
  ];

  for (const fn of chain) {
    try {
      const res = await fn();
      if (res.text && res.text.length > 10) {
        console.log('ai-fallback success', res.provider, res.model);
        return res;
      }
    } catch(e){ continue; }
  }

  // 5. FINAL UNLIMITED FALLBACK - knowledge base, no LLM needed, always works, Bangla+English
  const lastUser = messages[messages.length-1]?.content?.toLowerCase()||'';
  let fallback = '';
  if (lastUser.includes('bkash') || lastUser.includes('বিকাশ') || lastUser.includes('payment') || lastUser.includes('পেমেন্ট') || lastUser.includes('trx')) {
    fallback = `bKash পেমেন্ট: আমাদের পার্সোনাল নম্বর 01822417463 তে Send Money করুন। Amount: Starter ৳599 / Pro ৳1299 / Business ৳2999। তারপর TrxID টি https://hostamar.com/dashboard/payment এ সাবমিট করুন — আমরা ৫ মিনিটে Approve করব। Admin: https://hostamar.com/admin/payments — 6000 FREE credits — code TV20 20% OFF`;
  } else if (lastUser.includes('storage') || lastUser.includes('স্টোরেজ') || lastUser.includes('upload') || lastUser.includes('file')) {
    fallback = `Storage B2: 5GB FREE — https://hostamar.com/dashboard/storage এ upload করুন। S3 endpoint s3.us-east-005.backblazeb2.com bucket hostamar-prod। API: GET/POST/DELETE /api/storage with x-user-id header 50MB পর্যন্ত।`;
  } else if (lastUser.includes('tv') || lastUser.includes('channel') || lastUser.includes('চ্যানেল') || lastUser.includes('live')) {
    fallback = `TV: ৩৭০০ channels — https://hostamar.com/tv — API /api/tv/stable-channels?limit=20। Ad ticker ads tracked via /api/tv/ad-click।`;
  } else if (lastUser.includes('pricing') || lastUser.includes('price') || lastUser.includes('প্রাইস') || lastUser.includes('package')) {
    fallback = `Pricing: Starter ৳৫৯৯, Pro ৳১২৯৯, Business ৳২৯৯৯ — ৬০০০ FREE credits bKash/Nagad/Rocket — https://hostamar.com/pricing — code TV20 ২০% OFF। Hosting সহ unlimited AI video।`;
  } else {
    fallback = `Hostamar Support: ৫০+ services AI Video/Image/Logo/Voiceover Bangla, hosting, TV ৩৭০০ channels, storage ৫GB FREE, bKash ০১৮২২৪১৭৪৬৩। How can I help? Quick: /dashboard/payment for bKash, /dashboard/storage for files, /tv for TV, /pricing for plans।`;
  }
  return {text: fallback, model: 'knowledge-base-fallback', provider: 'fallback'};
}
