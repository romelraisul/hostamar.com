export async function callBestModel(messages: {role:string,content:string}[], systemPrompt: string): Promise<{text:string, model:string, provider:string}> {
  const system = {role:'system',content:systemPrompt};
  const allMessages = [system, ...messages];

  const chain: Array<() => Promise<{text:string, model:string, provider:string}>> = [
    // 1. Vercel AI Gateway IF key exists - try free models that don't need card
    async () => {
      if (!process.env.AI_GATEWAY_API_KEY) throw new Error('no gateway key');
      const models = ['openai/gpt-4o-mini','openai/gpt-3.5-turbo','meta/llama-3.1-8b','qwen/qwen-2.5-72b','google/gemini-1.5-flash-8b'];
      for (const m of models) {
        try {
          const r = await fetch(`${process.env.AI_GATEWAY_BASE_URL||'https://ai-gateway.vercel.sh/v1'}/chat/completions`,{
            method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.AI_GATEWAY_API_KEY}`},
            body: JSON.stringify({model:m, messages: allMessages, temperature:0.7, max_tokens:500})
          });
          if (!r.ok) continue;
          const j:any = await r.json(); const txt = j.choices?.[0]?.message?.content || j.choices?.[0]?.text || '';
          if (!txt || txt.length < 5) continue;
          return {text: txt, model: m, provider: 'vercel-gateway'};
        } catch(e){ continue; }
      }
      throw new Error('gateway all models failed');
    },
    // 2. litellm proxy at http://litellm:4000/v1 - free models in 9 containers
    async () => {
      const litellmUrl = process.env.LITELLM_BASE_URL || 'http://litellm:4000/v1';
      const models = ['qwen3.8-max-free','llama-3.1-8b-instruct','kilo-auto','hy3-free','gpt-4o-mini','claude-3-haiku'];
      for (const m of models) {
        try {
          const r = await fetch(`${litellmUrl}/chat/completions`,{
            method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.LITELLM_API_KEY||'sk-1234'}`},
            body: JSON.stringify({model:m, messages: allMessages, temperature:0.7, max_tokens:500})
          });
          if (!r.ok) continue;
          const j:any = await r.json(); const txt = j.choices?.[0]?.message?.content; if (!txt || txt.length < 5) continue;
          return {text: txt, model: m, provider: 'litellm'};
        } catch(e){ continue; }
      }
      throw new Error('litellm all failed');
    },
    // 3. Nvidia API free llama-3.1-8b
    async () => {
      if (!process.env.NVIDIA_API_KEY) throw new Error('no nvidia key');
      const r = await fetch('https://integrate.api.nvidia.com/v1/chat/completions',{
        method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.NVIDIA_API_KEY}`},
        body: JSON.stringify({model:'meta/llama-3.1-8b-instruct', messages: allMessages, temperature:0.7, max_tokens:500})
      });
      if (!r.ok) throw new Error('nvidia fail '+r.status);
      const j:any = await r.json(); return {text: j.choices[0].message.content, model: 'llama-3.1-8b', provider: 'nvidia'};
    },
    // 4. Groq free if key exists
    async () => {
      if (!process.env.GROQ_API_KEY) throw new Error('no groq');
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions',{
        method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.GROQ_API_KEY}`},
        body: JSON.stringify({model:'llama-3.1-8b-instant', messages: allMessages, temperature:0.7, max_tokens:500})
      });
      if (!r.ok) throw new Error('groq fail');
      const j:any = await r.json(); return {text: j.choices[0].message.content, model: 'llama-3.1-8b-instant', provider: 'groq'};
    },
    // 5. OpenRouter free models
    async () => {
      if (!process.env.OPENROUTER_API_KEY) throw new Error('no openrouter');
      const models = ['meta-llama/llama-3.1-8b-instruct:free','qwen/qwen-2-7b-instruct:free','google/gemma-2-9b-it:free'];
      for (const m of models) {
        try {
          const r = await fetch('https://openrouter.ai/api/v1/chat/completions',{
            method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.OPENROUTER_API_KEY}`,'HTTP-Referer':'https://hostamar.com','X-Title':'Hostamar'},
            body: JSON.stringify({model:m, messages: allMessages, temperature:0.7, max_tokens:500})
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

  // 6. FINAL UNLIMITED FALLBACK - knowledge base, no LLM needed, always works, Bangla+English
  const lastUser = messages[messages.length-1]?.content?.toLowerCase()||'';
  let fallback = '';
  if (lastUser.includes('bkash') || lastUser.includes('বিকাশ') || lastUser.includes('payment') || lastUser.includes('পেমেন্ট') || lastUser.includes('trx')) {
    fallback = `bKash পেমেন্ট: আমাদের পার্সোনাল নম্বর 01822417463 তে Send Money করুন। Amount: Starter ৳599 / Pro ৳1299 / Business ৳2999। তারপর TrxID টি https://hostamar.com/dashboard/payment এ সাবমিট করুন — আমরা ৫ মিনিটে Approve করব। Admin: https://hostamar.com/admin/payments — 6000 FREE credits — code TV20 20% OFF`;
  } else if (lastUser.includes('storage') || lastUser.includes('স্টোরেজ') || lastUser.includes('upload') || lastUser.includes('file')) {
    fallback = `Storage B2: 5GB FREE — https://hostamar.com/dashboard/storage এ upload করুন। S3 endpoint s3.us-east-005.backblazeb2.com bucket hostamar-prod 9 objects currently। API: GET/POST/DELETE /api/storage with x-user-id header 50MB পর্যন্ত।`;
  } else if (lastUser.includes('tv') || lastUser.includes('channel') || lastUser.includes('চ্যানেল') || lastUser.includes('live')) {
    fallback = `TV: ৩৭০০ channels, stable ২০ — https://hostamar.com/tv — top stable America's Next Top Model stability ৮৯। API /api/tv/stable-channels?limit=20। Ad ticker ২৩ ads tracked via /api/tv/ad-click।`;
  } else if (lastUser.includes('pricing') || lastUser.includes('price') || lastUser.includes('প্রাইস') || lastUser.includes('package')) {
    fallback = `Pricing: Starter ৳৫৯৯, Pro ৳১২৯৯, Business ৳২৯৯৯ — ৬০০০ FREE credits bKash/Nagad/Rocket — https://hostamar.com/pricing — code TV20 ২০% OFF। Hosting সহ unlimited AI video।`;
  } else {
    fallback = `Hostamar Support: ৫০+ services AI Video/Image/Logo/Voiceover Bangla, hosting, TV ৩৭০০ channels, storage ৫GB FREE, bKash ০১৮২২৪১৭৪৬৩। How can I help? Quick: /dashboard/payment for bKash, /dashboard/storage for files, /tv for TV, /pricing for plans।`;
  }
  return {text: fallback, model: 'knowledge-base-fallback', provider: 'fallback'};
}
