'use client'
import { useState } from 'react'

export default function Workflows() {
  const [result, setResult] = useState<any>(null)
  async function run(type: string) {
    const r = await fetch('/api/video-os/comfyui', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        prompt:
          type === 'qwen-logo'
            ? 'breaking news lower third, transparent, red gradient, Bengali text placeholder — 4 variants 1024x256'
            : type === 'laya'
              ? 'Laya decision model routing - Jev open-source free alternative Apache 2.0 33ms 1GB RAM 7x faster'
              : 'MiniMax H3 Bogura News filler 10s — transparent lower third overlay stereo audio',
      }),
    })
    const d = await r.json()
    setResult(d)
  }
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-yellow-100 border-l-4 border-yellow-500 p-3 mb-4 text-sm">
        <b>ক্লিয়ার হলো! তুমি যে রিলটা দিয়েছো ওটা GF মডেল না, Laya মডেলের।</b>
        <br />
        ওই রিলে যাকে দেখছো <b>Mahan Jafari</b> - ও Laya কে প্রমোট করছে, যেটা হলো Jev এর{' '}
        <b>ওপেন-সোর্স, পুরোপুরি ফ্রী অল্টারনেটিভ</b>।
        <br />
        Laya = Jev ক্লোন Apache 2.0, 7x faster (33ms vs 236ms), 1GB RAM, accuracy 0.766 vs Jev 0.727. Jev =
        closed, no papers, no weights. Laya = fully open, self-hosted, $0 inference.
      </div>
      <h1 className="text-2xl font-bold">
        RTX 5060 8GB — Qwen 2.1 + MiniMax H3 + Laya (Jev Free Alt) — ComfyUI v0.3.8 CUDA 12.6 — WSL ONLY
      </h1>
      <p className="text-sm opacity-70 mt-2">
        একই ComfyUI তে ৩টা পাওয়ারহাউস — Qwen = RGBA logo factory, MiniMax = Audio video filler, Laya = Decision
        router (Jev free alt, 33ms, 1GB RAM). Bogura TV Daily Factory 10 min. WSL ONLY (Windows C: no space).
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => run('qwen-logo')} className="bg-black text-white px-4 py-2 rounded">
          Qwen RGBA Logo Factory — Lower Third
        </button>
        <button onClick={() => run('minimax-ref2video')} className="bg-black text-white px-4 py-2 rounded">
          MiniMax H3 Ref2Video 10s Filler + Stereo
        </button>
        <button onClick={() => run('laya')} className="bg-green-600 text-white px-4 py-2 rounded">
          Laya Jev Free Alt — 33ms 1GB RAM 7x Faster
        </button>
      </div>
      <div className="mt-4 border rounded p-3 text-xs font-mono whitespace-pre-wrap max-h-96 overflow-auto">
        {result
          ? JSON.stringify(result, null, 2)
          : 'Click — runs on WSL ~/ omni.hostamar.com :20128 + ComfyUI :8188 RTX 5060 8GB — Qwen + MiniMax + Laya + Old'}
      </div>
      <div className="mt-4 text-xs space-y-2">
        <div>
          <b>GF vs Laya:</b> Mahan Jafari promotes Laya (Jev open-source free alt), NOT GF model. Jev = TypeSafe AI
          (Diogo Almeida, ChatGPT co-inventor), closed, $0.042/M. Laya = Nandakishor M, Apache 2.0, 7x faster, 1GB RAM.
        </div>
        <div>
          <b>Old + New + Laya WSL ONLY:</b> Qwen 7.26GB + 6.31GB + 6.8GB GGUF + MiniMax 12GB + Laya &lt;1GB + Old Wan/Kling.
        </div>
      </div>
    </div>
  )
}
