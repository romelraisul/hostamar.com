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
            : 'MiniMax H3 Bogura News filler 10s — transparent lower third overlay stereo audio',
      }),
    })
    const d = await r.json()
    setResult(d)
  }
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">RTX 5060 8GB — Qwen 2.1 + MiniMax H3 — ComfyUI v0.3.8 CUDA 12.6</h1>
      <p className="text-sm opacity-70 mt-2">
        একই ComfyUI তে দুটো পাওয়ারহাউস — Qwen = RGBA logo factory, MiniMax = Audio video filler. Bogura TV Daily Factory 10 min.
      </p>
      <div className="mt-4 flex gap-2">
        <button onClick={() => run('qwen-logo')} className="bg-black text-white px-4 py-2 rounded">
          Qwen RGBA Logo Factory — Transparent Lower Third
        </button>
        <button onClick={() => run('minimax-ref2video')} className="bg-black text-white px-4 py-2 rounded">
          MiniMax H3 Ref2Video 10s Filler + Stereo
        </button>
      </div>
      <div className="mt-4 border rounded p-3 text-xs font-mono whitespace-pre-wrap">
        {result
          ? JSON.stringify(result, null, 2)
          : 'Click button — runs on your PC via omni.hostamar.com tunnel :20128 553 LIVE + ComfyUI :8188 RTX 5060 8GB'}
      </div>
    </div>
  )
}
