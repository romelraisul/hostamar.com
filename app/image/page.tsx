'use client'

import { useState } from 'react'

const GREEN = '#0E7C3A'

export default function ImageGeneratePage() {
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('blurry, low quality, ugly, distorted, watermark, text')
  const [width, setWidth] = useState(1024)
  const [height, setHeight] = useState(1024)
  const [steps, setSteps] = useState(4)
  const [cfg, setCfg] = useState(7.0)
  const [model, setModel] = useState('sd_xl_turbo_1.0_fp16.safetensors')
  const [images, setImages] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const [timeElapsed, setTimeElapsed] = useState(0)

  const models = [
    { id: 'sd_xl_turbo_1.0_fp16.safetensors', name: 'SDXL Turbo (1s, Good)' },
    { id: 'sd_xl_base_1.0.safetensors', name: 'SDXL Base (10s, Best)' },
    { id: 'realvisxlV40.safetensors', name: 'RealVisXL (15s, Photo)' },
  ]

  const generate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) {
      setError('Prompt required')
      return
    }

    setLoading(true)
    setError('')
    setImages([])
    setProgress(0)
    setTimeElapsed(0)

    const startTime = Date.now()
    const timer = setInterval(() => {
      setTimeElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    try {
      const res = await fetch('/api/ai/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          negativePrompt,
          width,
          height,
          steps,
          cfg,
          model,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || data.details || 'Generation failed')
        setLoading(false)
        clearInterval(timer)
        return
      }

      setImages(data.images || [])
      setLoading(false)
      clearInterval(timer)
    } catch (err) {
      setError('Network error')
      setLoading(false)
      clearInterval(timer)
    }
  }

  return (
    <div className="min-h-screen bg-[#FCFCF9] text-zinc-900 antialiased">
      <div className="mx-auto max-w-[760px] px-4 py-12">
        <h1 className="text-3xl font-bold">AI Image Generator</h1>
        <p className="mt-2 text-zinc-600">
          Generate professional images for your business. Fast, free, and private.
        </p>

        <form onSubmit={generate} className="mt-6 space-y-4 rounded-2xl border border-zinc-200 bg-white p-6">
          <div>
            <label className="block text-[13px] font-medium mb-1">Prompt (English works best)</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              required
              rows={3}
              className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-[14px] focus:outline-none focus:border-[#0E7C3A]"
              placeholder="Professional product photo of a white cotton tajbiya on wooden table, soft lighting, 4K"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium mb-1">Negative Prompt</label>
            <input
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-[14px] focus:outline-none focus:border-[#0E7C3A]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium mb-1">Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-[14px]"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-medium mb-1">Size</label>
              <select
                value={`${width}x${height}`}
                onChange={(e) => {
                  const [w, h] = e.target.value.split('x').map(Number)
                  setWidth(w)
                  setHeight(h)
                }}
                className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-[14px]"
              >
                <option value="1024x1024">1024x1024 (Square)</option>
                <option value="1920x1080">1920x1080 (Wide)</option>
                <option value="1080x1920">1080x1920 (Portrait)</option>
                <option value="832x480">832x480 (Video Frame)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium mb-1">Steps ({steps})</label>
              <input
                type="range"
                min="1"
                max="50"
                value={steps}
                onChange={(e) => setSteps(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium mb-1">CFG ({cfg})</label>
              <input
                type="range"
                min="1"
                max="30"
                step="0.5"
                value={cfg}
                onChange={(e) => setCfg(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="w-full bg-[#0E7C3A] hover:bg-[#0c6a32] disabled:bg-zinc-300 text-white font-semibold py-3 rounded-xl transition text-[14px]"
          >
            {loading ? `Generating... ${timeElapsed}s` : 'Generate Image'}
          </button>
        </form>

        {loading && (
          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 text-center">
            <div className="inline-block w-8 h-8 border-4 border-[#0E7C3A] border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-zinc-600">
              Generating with {model.split('.')[0]}... ({timeElapsed}s)
            </p>
            <p className="mt-1 text-[12px] text-zinc-400">
              First run takes 30-60s to load model into GPU
            </p>
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {images.length > 0 && (
          <div className="mt-6 space-y-4">
            <h2 className="text-lg font-semibold">Generated Images</h2>
            <div className="grid grid-cols-1 gap-4">
              {images.map((url, i) => (
                <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <img
                    src={url}
                    alt={`Generated ${i + 1}`}
                    className="w-full rounded-xl"
                    loading="lazy"
                  />
                  <a
                    href={url}
                    download
                    className="mt-3 inline-flex h-11 items-center rounded-full px-6 font-semibold text-white"
                    style={{ background: GREEN }}
                  >
                    Download HD
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Pricing (per image)</h2>
          <ul className="mt-3 space-y-2 text-[14px] text-zinc-600">
            <li>• <strong>Free</strong> — 5 images/day (720p)</li>
            <li>• <strong>৳50/month</strong> — 100 images, HD, priority</li>
            <li>• <strong>৳200/month</strong> — Unlimited, 4K, no watermark</li>
            <li>• <strong>৳500/image</strong> — Commercial license</li>
          </ul>
          <p className="mt-3 text-[12px] text-zinc-400">
            Pay via bKash: 01822417463
          </p>
        </div>
      </div>
    </div>
  )
}
