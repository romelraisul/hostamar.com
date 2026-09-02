'use client'

/**
 * /dashboard/marketing client — V29.
 * Completed videos → select → choose platform → MANUAL publish click.
 * Honest states everywhere: no connected token → CONNECT_PLATFORM guidance;
 * campaign builder → honest "Coming soon". Nothing auto-fires.
 */
import { useEffect, useState } from 'react'
import { Megaphone, Facebook, Youtube, Instagram, Video as TikTokIcon, CheckSquare, Square } from 'lucide-react'

interface VideoRow { id: string; title: string; status: string; url: string | null }
type Platform = 'facebook' | 'youtube' | 'instagram' | 'tiktok'

const PLATFORMS: Array<{ id: Platform; label: string; icon: any }> = [
  { id: 'facebook', label: 'Facebook Page', icon: Facebook },
  { id: 'youtube', label: 'YouTube', icon: Youtube },
  { id: 'instagram', label: 'Instagram', icon: Instagram },
  { id: 'tiktok', label: 'TikTok', icon: TikTokIcon },
]

export default function MarketingClient() {
  const [videos, setVideos] = useState<VideoRow[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [platform, setPlatform] = useState<Platform | ''>('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/videos?limit=50')
      .then((r) => r.json())
      .then((d) => setVideos((d.videos || []).filter((v: VideoRow) => v.status === 'completed' || v.status === 'ready')))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toggle = (id: string) => {
    setMsg('')
    setSelected((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  const publish = async () => {
    if (!platform || selected.size === 0) {
      setMsg('একটি প্ল্যাটফর্ম এবং অন্তত একটি ভিডিও বাছাই করুন')
      return
    }
    setBusy(true)
    setMsg('')
    try {
      const results: string[] = []
      for (const videoId of selected) {
        const res = await fetch('/api/marketing/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId, platform }),
        })
        const d = await res.json().catch(() => ({}))
        if (res.status === 401 && d.code === 'CONNECT_PLATFORM') {
          results.push('Connect your ' + platform + ' account first (Settings → Marketing)')
          break
        } else if (res.status === 409) {
          results.push('WEBM এক্সপোর্ট আগে করুন (player → Preview & Export)')
          break
        } else if (res.status === 501) {
          results.push('Token connected — upload ships with the marketing module. কিছু পোস্ট হয়নি।')
          break
        } else if (res.ok) {
          results.push('✓ published: ' + (d.postId || videoId))
        } else {
          results.push('Error: ' + String(d.error || res.status))
        }
      }
      setMsg(results.join(' · '))
    } catch (e: any) {
      setMsg('ব্যর্থ: ' + String(e?.message || e).slice(0, 120))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-[#0E7C3A]/10 rounded-xl"><Megaphone className="w-6 h-6 text-[#0E7C3A]" /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ডিজিটাল মার্কেটিং</h1>
          <p className="text-sm text-gray-500">আলাদা মডিউল — সব পাবলিশ ম্যানুয়াল, কখনো অটো নয়</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>ম্যানুয়াল-অনলি:</strong> ভিডিও সম্পন্ন হলে কিছু অটোমেটিক পোস্ট হয় না। আপনি নিজে ক্লিক করলেই শুধু তখন পাবলিশ হবে, আপনার নিজের কানেক্ট করা অ্যাকাউন্ট থেকে।
      </div>

      {/* Platform picker */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            onClick={() => { setPlatform(p.id); setMsg('') }}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${platform === p.id ? 'border-[#0E7C3A] bg-[#0E7C3A]/5' : 'border-gray-200 hover:border-gray-300'}`}
          >
            <p.icon className="w-6 h-6 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">{p.label}</span>
          </button>
        ))}
      </div>

      {/* Video list */}
      <div className="bg-white rounded-xl border p-4">
        <h2 className="font-semibold text-gray-900 mb-3">সম্পন্ন ভিডিও ({videos.length})</h2>
        {loading ? (
          <p className="text-sm text-gray-400">লোড হচ্ছে…</p>
        ) : videos.length === 0 ? (
          <p className="text-sm text-gray-400">এখনও কোনো সম্পন্ন ভিডিও নেই — Videos পেজ থেকে তৈরি করুন।</p>
        ) : (
          <div className="space-y-2">
            {videos.map((v) => (
              <button
                key={v.id}
                onClick={() => toggle(v.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${selected.has(v.id) ? 'border-[#0E7C3A] bg-[#0E7C3A]/5' : 'border-gray-200 hover:border-gray-300'}`}
              >
                {selected.has(v.id) ? <CheckSquare className="w-5 h-5 text-[#0E7C3A]" /> : <Square className="w-5 h-5 text-gray-400" />}
                <span className="flex-1 text-sm text-gray-800 line-clamp-1">{v.title}</span>
                <span className="text-xs text-gray-400">{v.url && !v.url.startsWith('manifest://') ? 'WEBM ✓' : 'manifest'}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Publish */}
      <div className="flex items-center gap-3">
        <button
          onClick={publish}
          disabled={busy || !platform || selected.size === 0}
          className="px-6 py-3 bg-[#0E7C3A] text-white rounded-xl font-medium disabled:opacity-40 hover:bg-[#0b6b31] transition-colors"
        >
          {busy ? 'পাবলিশ হচ্ছে…' : `পাবলিশ (${selected.size})`}
        </button>
        {msg && <span className="text-sm text-gray-600">{msg}</span>}
      </div>

      {/* Campaign builder — honest TODO */}
      <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-6 text-center">
        <h3 className="font-semibold text-gray-700 mb-1">ক্যাম্পেইন বিল্ডার</h3>
        <p className="text-sm text-gray-500">Coming soon — campaign scheduling, auto-caption, hashtag AI। এটি আলাদা মডিউল হিসেবে যাবে; এখন পাবলিশ ম্যানুয়াল ক্লিকেই সীমাবদ্ধ।</p>
      </div>
    </div>
  )
}
