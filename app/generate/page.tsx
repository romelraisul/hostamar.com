'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const GREEN = '#0E7C3A'
const API = process.env.NEXT_PUBLIC_VIDEO_API_URL || 'http://localhost:8000'
const API_KEY = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_VIDEO_API_KEY) || 'local-dev-key'
const AUTH_HEADER_VALUE = 'Bearer ' + API_KEY

type Status = 'idle' | 'queued' | 'running' | 'completed' | 'failed'

export default function VideoGeneratePage() {
  const router = useRouter()
  const [promptBn, setPromptBn] = useState('')
  const [style, setStyle] = useState('ads')
  const [aspect, setAspect] = useState('9:16')
  const [withBgm, setWithBgm] = useState(true)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [jobId, setJobId] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [progress, setProgress] = useState(0)
  const [videoUrl, setVideoUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const pollStatus = async (id: string) => {
    for (let i = 0; i < 240; i++) {
      await new Promise((r) => setTimeout(r, 5000))
      try {
        const res = await fetch(`${API}/v1/status/${id}`, {
          headers: { Authorization: AUTH_HEADER_VALUE },
        })
        if (!res.ok) continue
        const data = await res.json()
        setStatus(data.status)
        setProgress(Number(data.progress || 0))
        if (data.status === 'completed') {
          setVideoUrl(data.video_url)
          setLoading(false)
          return
        }
        if (data.status === 'failed') {
          setError(data.error || 'render failed')
          setLoading(false)
          return
        }
      } catch {
        /* transient; keep polling */
      }
    }
    setError('timeout: job did not finish in 20 min')
    setLoading(false)
  }

  const start = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setVideoUrl('')
    setProgress(0)
    setStatus('queued')
    try {
      const res = await fetch(`${API}/v1/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: AUTH_HEADER_VALUE },
        body: JSON.stringify({
          prompt_bn: promptBn,
          style,
          aspect_ratio: aspect,
          with_bgm: withBgm,
          avatar_image_url: avatarUrl || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.detail || 'generate failed')
        setLoading(false)
        return
      }
      setJobId(data.job_id)
      pollStatus(data.job_id)
    } catch {
      setError('network error')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FCFCF9] text-zinc-900 antialiased">
      <div className="mx-auto max-w-[760px] px-4 py-12">
        <Link href="/video" className="text-[13px] text-zinc-500 hover:text-zinc-800">← back to Video</Link>
        <h1 className="mt-4 text-3xl font-bold">ভিডিও বানান — একটা প্রম্পট দিন</h1>
        <p className="mt-2 text-zinc-600">Bangla prompt → script + voice + caption + BGM + talking avatar, 4K export.</p>

        <form onSubmit={start} className="mt-6 space-y-4 rounded-2xl border border-zinc-200 bg-white p-6">
          <div>
            <label className="block text-[13px] font-medium mb-1">Bangla prompt</label>
            <textarea
              value={promptBn}
              onChange={(e) => setPromptBn(e.target.value)}
              required
              rows={3}
              className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-[14px] focus:outline-none focus:border-[#0E7C3A]"
              placeholder="একটি কটন পাঞ্জাবির ১৫ সেকেন্ড অ্যাড, বাজারের ব্যাকগ্রাউন্ড, সাবটাইটল সহ"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium mb-1">Style</label>
              <select value={style} onChange={(e) => setStyle(e.target.value)} className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-[14px]">
                <option value="ads">Ads</option>
                <option value="reels">Reels</option>
                <option value="tutorial">Tutorial</option>
                <option value="promo">Promo</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-medium mb-1">Aspect ratio</label>
              <select value={aspect} onChange={(e) => setAspect(e.target.value)} className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-[14px]">
                <option value="9:16">9:16 Reels/TikTok/Shorts</option>
                <option value="16:9">16:9 YouTube</option>
                <option value="1:1">1:1 Square</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium mb-1">Avatar image URL (optional)</label>
            <input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-[14px] focus:outline-none focus:border-[#0E7C3A]"
              placeholder="https://.../avatar.png (for talking-head mode)"
            />
          </div>

          <label className="flex items-center gap-2 text-[14px]">
            <input type="checkbox" checked={withBgm} onChange={(e) => setWithBgm(e.target.checked)} /> BGM যোগ করুন (ACE-Step)
          </label>

          <button
            type="submit"
            disabled={loading || !promptBn.trim()}
            className="w-full bg-[#0E7C3A] hover:bg-[#0c6a32] disabled:bg-zinc-300 text-white font-semibold py-3 rounded-xl transition text-[14px]"
          >
            {loading ? 'তৈরি হচ্ছে...' : 'ভিডিও জেনারেট করুন →'}
          </button>
        </form>

        {jobId && (
          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="flex items-center justify-between text-[13px] text-zinc-500">
              <span>Job: {jobId}</span>
              <span className="font-medium" style={{ color: GREEN }}>{status}</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-zinc-100 overflow-hidden">
              <div className="h-full transition-all" style={{ width: `${Math.round(progress * 100)}%`, background: GREEN }} />
            </div>

            {videoUrl && (
              <div className="mt-4">
                <video src={videoUrl} controls className="w-full rounded-xl" />
                <a
                  href={videoUrl}
                  download
                  className="mt-3 inline-flex h-11 items-center rounded-full px-6 font-semibold text-white"
                  style={{ background: GREEN }}
                >
                  4K ডাউনলোড
                </a>
                <p className="mt-2 text-[12px] text-zinc-400">স্বয়ংক্রিয় মুছে যাবে ৭ দিন পরে (signed URL)।</p>
              </div>
            )}
            {error && <p className="mt-3 text-[13px] text-red-600">{error}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
