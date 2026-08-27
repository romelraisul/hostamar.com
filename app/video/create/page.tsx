'use client'

import { useState, useEffect } from 'react'
import PromptSuggestions from '@/components/PromptSuggestions'

const GREEN = '#0E7C3A'

type Model = 'bonsai' | 'qwen36'
type Status = 'idle' | 'scripting' | 'rendering' | 'done' | 'error'

interface Scene {
  id: number
  description: string
  prompt: string
  duration: number
  status: 'pending' | 'rendering' | 'done'
}

export default function CreateVideoPage() {
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState<Model>('bonsai')
  const [status, setStatus] = useState<Status>('idle')
  const [scenes, setScenes] = useState<Scene[]>([])
  const [progress, setProgress] = useState(0)
  const [videoUrl, setVideoUrl] = useState('')
  const [error, setError] = useState('')
  const [qwenAvailable, setQwenAvailable] = useState(false)

  // Check if Qwen3.6 is available
  useEffect(() => {
    fetch('/api/video/models')
      .then(r => r.json())
      .then(d => setQwenAvailable(d.qwen36 || false))
      .catch(() => setQwenAvailable(false))
  }, [])

  async function createVideo() {
    if (!prompt.trim()) return
    setStatus('scripting')
    setError('')
    setScenes([])
    setProgress(0)
    setVideoUrl('')

    try {
      // Step 1: Generate script from Bonsai/Qwen
      const res = await fetch('/api/video/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create video')
      }

      const data = await res.json()
      setScenes(data.scenes || [])
      setStatus('rendering')

      // Step 2: Poll for progress
      const jobId = data.jobId
      const interval = setInterval(async () => {
        try {
          const progRes = await fetch(`/api/video/status/${jobId}`)
          const prog = await progRes.json()
          setProgress(prog.progress || 0)

          if (prog.status === 'done') {
            clearInterval(interval)
            setStatus('done')
            setVideoUrl(prog.videoUrl || '')
          } else if (prog.status === 'error') {
            clearInterval(interval)
            setStatus('error')
            setError(prog.error || 'Rendering failed')
          }
        } catch {
          // ignore poll errors
        }
      }, 3000)

    } catch (e: any) {
      setStatus('error')
      setError(e.message)
    }
  }

  return (
    <div className="min-h-screen bg-[#0F1115] text-white antialiased">
      <div className="mx-auto max-w-[900px] px-4 py-12">
        <h1 className="text-3xl font-bold">ভিডিও তৈরি করুন</h1>
        <p className="mt-2 text-zinc-400">
          AI স্ক্রিপ্ট জেনারেট করে স্বয়ংক্রিয় ভিডিও বানান
        </p>

        {/* Model Selection */}
        <div className="mt-8">
          <label className="text-sm font-medium text-zinc-300">AI মডেল</label>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <button
              onClick={() => setModel('bonsai')}
              className={`rounded-xl border p-4 text-left transition ${
                model === 'bonsai'
                  ? 'border-[#0E7C3A] bg-[#0E7C3A]/10'
                  : 'border-white/10 bg-white/[0.03] hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">⚡</span>
                <span className="font-semibold">Bonsai 27B</span>
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                দ্রুত, বা�াংলা স্ক্রিপ্ট, ~৩০ সেকেন্ড
              </p>
            </button>

            <button
              onClick={() => qwenAvailable && setModel('qwen36')}
              disabled={!qwenAvailable}
              className={`rounded-xl border p-4 text-left transition ${
                !qwenAvailable
                  ? 'border-white/5 bg-white/[0.01] opacity-40 cursor-not-allowed'
                  : model === 'qwen36'
                  ? 'border-[#0E7C3A] bg-[#0E7C3A]/10'
                  : 'border-white/10 bg-white/[0.03] hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🧠</span>
                <span className="font-semibold">Qwen 3.6</span>
                {!qwenAvailable && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">
                    ডাউনলোড হচ্ছে
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                গভীর স্ক্রিপ্ট, ক্রিয়েটিভ স্টোরিটেলিং
              </p>
            </button>
          </div>
        </div>

        {/* Prompt Input */}
        <div className="mt-6">
          <label className="text-sm font-medium text-zinc-300">ভিডিওর বর্ণনা</label>
          <PromptSuggestions category="video" onPick={setPrompt} />
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 text-[14px] text-white placeholder:text-zinc-500 focus:border-[#0E7C3A] focus:outline-none focus:ring-1 focus:ring-[#0E7C3A]/50"
            placeholder="যেমন: আমার বিরিয়ানি রেস্তোরাঁর জন্য ৩০ সেকেন্ডের ঈদ অফার ভিডিও বানাও। দাম ৫০০ টাকা, পেমেন্ট bKash।"
          />
        </div>

        {/* Create Button */}
        <button
          onClick={createVideo}
          disabled={status === 'scripting' || status === 'rendering' || !prompt.trim()}
          className="mt-6 w-full rounded-xl py-3.5 font-medium text-white transition disabled:opacity-50"
          style={{ background: status === 'scripting' || status === 'rendering' ? '#555' : GREEN }}
        >
          {status === 'scripting'
            ? 'স্ক্রিপ্ট তৈরি হচ্ছে...'
            : status === 'rendering'
            ? 'ভিডিও রেন্ডার হচ্ছে...'
            : 'ভিডিও বানাও'}
        </button>

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Progress */}
        {(status === 'scripting' || status === 'rendering') && (
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm text-zinc-400">
              <span>
                {status === 'scripting' ? 'স্ক্রিপ্ট জেনারেট হচ্ছে...' : 'ভিডিও রেন্ডার হচ্ছে...'}
              </span>
              <span>{progress}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: GREEN }}
              />
            </div>

            {/* Scene List */}
            {scenes.length > 0 && (
              <div className="mt-4 space-y-2">
                {scenes.map((scene) => (
                  <div
                    key={scene.id}
                    className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs">
                      {scene.id}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-zinc-300">{scene.description}</p>
                      <p className="text-[11px] text-zinc-500">{scene.duration}s</p>
                    </div>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full ${
                        scene.status === 'done'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : scene.status === 'rendering'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-white/10 text-zinc-400'
                      }`}
                    >
                      {scene.status === 'done' ? '✅' : scene.status === 'rendering' ? '⏳' : '⏸'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Result */}
        {status === 'done' && videoUrl && (
          <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-sm font-medium text-emerald-400">✅ ভিডিও তৈরি হয়েছে!</p>
            <video
              src={videoUrl}
              controls
              className="mt-3 w-full rounded-lg"
            />
            <a
              href={videoUrl}
              download
              className="mt-3 inline-block rounded-lg px-4 py-2 text-sm font-medium text-white"
              style={{ background: GREEN }}
            >
              ডাউনলোড করুন
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
