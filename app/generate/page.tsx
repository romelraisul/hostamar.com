'use client'

import { useState } from 'react'
import Link from 'next/link'

const PRIMARY = '#0E7C3A'
const ACCENT = '#F59E0B'

type Status = 'idle' | 'processing' | 'completed' | 'failed'

const DEMOS = [
  { tag: 'Eid', title: 'ঈদ কালেকশন — ৫০% ছাড়', desc: 'জামা/পাঞ্জাবি রিলস 9:16', grad: 'from-[#0E7C3A] to-[#0c6a32]', icon: '🌙' },
  { tag: 'Boishakh', title: 'পহেলা বৈশাখ অফার', desc: 'শাড়ি/লুঙ্গি প্রোমো 30s', grad: 'from-[#F59E0B] to-[#D97706]', icon: '🎉' },
  { tag: '11.11', title: '11.11 মেগা সেল', desc: 'ফ্ল্যাশ ডিল + কাউন্টডাউন', grad: 'from-[#0F172A] to-[#1E293B]', icon: '⚡' },
]

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'InVideo $17 vs Hostamar?', acceptedAnswer: { '@type': 'Answer', text: 'InVideo Plus $17/mo (75 credits, watermark-free). Hostamar FREE ৳0 — Bangla script + voice + caption + BGM, 10 videos/month free. Pictory Starter $19, Veed Lite $12 — Hostamar still FREE.' } },
    { '@type': 'Question', name: 'AI marketing video Bangladesh কত দ্রুত?', acceptedAnswer: { '@type': 'Answer', text: 'একটা বাংলা প্রম্পট দিন — 90 সেকেন্ডে 4K ভিডিও, watermark-free export। ঈদ/বৈশাখ/11.11 টেমপ্লেট রেডি।' } },
    { '@type': 'Question', name: 'bKash দিয়ে পেমেন্ট?', acceptedAnswer: { '@type': 'Answer', text: 'হ্যাঁ — bKash/Nagad/Rocket অটো, কোনো ডলার কার্ড লাগবে না। Free থেকে Starter ৳2000/yr।' } },
    { '@type': 'Question', name: 'Watermark থাকে?', acceptedAnswer: { '@type': 'Answer', text: 'না — FREE তেও watermark-free 1080p, Pro তে 4K। Veed free তে watermark থাকে, Hostamar এ নয়।' } },
    { '@type': 'Question', name: 'Commercial use?', acceptedAnswer: { '@type': 'Answer', text: 'হ্যাঁ — আপনার ব্র্যান্ড, আপনার ভিডিও, ফেসবুক/ইউটিউব/টিকটক সবখানে ব্যবহার করুন।' } },
  ],
}

export default function VideoGeneratePage() {
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

  const start = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(''); setVideoUrl(''); setProgress(0); setStatus('processing')
    try {
      // Same-origin wired generate — auth cookie, credits, creditTransaction, B2-ready
      const params = new URLSearchParams(window.location.search)
      const serviceId = params.get('serviceId') || 's01'
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ serviceId, prompt: promptBn }),
      })
      const data = await res.json()
      if (res.status === 401) { window.location.href = '/login'; return }
      if (res.status === 402) { setError(`ক্রেডিট লাগবে ${data.needed}cr — ব্যালেন্স ${data.balance}cr। টপ-আপ: bKash ${data.bkash}`); setLoading(false); return }
      if (!res.ok || !data.success) { setError(data.error || 'generate failed'); setLoading(false); return }
      setStatus('completed'); setProgress(1)
      setVideoUrl(data.video.url)
      setJobId(data.video.id)
      setLoading(false)
    } catch { setError('network error'); setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0F172A] antialiased selection:bg-[#0E7C3A]/15">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <div className="mx-auto max-w-[1180px] px-4 md:px-6 py-4">
        <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-zinc-500 hover:text-zinc-800">← হোম</Link>
      </div>

      <section className="mx-auto max-w-[1180px] px-4 md:px-6">
        <div className="rounded-[24px] bg-[#F8FAFC] border border-zinc-200 px-5 md:px-7 py-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-white border text-zinc-700 font-medium">bKash • Nagad • Rocket</span>
            <span className="px-2.5 py-1 rounded-full bg-white border text-zinc-700">BDIX Dhaka • 20ms</span>
            <span className="px-2.5 py-1 rounded-full bg-[#0E7C3A] text-white font-semibold">500+ creators</span>
            <span className="hidden sm:inline px-2.5 py-1 rounded-full bg-white border">Watermark-free</span>
          </div>
          <div className="text-xs text-zinc-600">InVideo $17/mo vs <span className="font-bold text-[#0E7C3A]">Hostamar ৳0 FREE</span> • Pictory $19 vs ৳0 • Veed $12 vs ৳0</div>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-4 md:px-6 mt-6">
        <h1 className="text-[28px] md:text-[36px] font-bold tracking-tight leading-tight">AI ভিডিও জেনারেটর — ৳0 তে শুরু</h1>
        <p className="mt-2 text-zinc-600 max-w-[760px] leading-relaxed">একটা বাংলা প্রম্পট দিন — স্ক্রিপ্ট + ভয়েস + ক্যাপশন + BGM + talking avatar, 4K export। <span className="font-semibold text-[#0F172A]">InVideo Plus $17 (75cr) vs Hostamar ৳0</span> — 500+ creators ইতিমধ্যে ব্যবহার করছে।</p>
        <div className="mt-4 grid sm:grid-cols-3 gap-3">
          {DEMOS.map((d) => (
            <div key={d.tag} className={`rounded-2xl p-4 text-white bg-gradient-to-br ${d.grad} flex flex-col justify-between min-h-[110px]`}>
              <div>
                <div className="text-xs px-2 py-0.5 rounded-full bg-white/20 inline-block border border-white/30">{d.tag} {d.icon}</div>
                <div className="mt-2 font-semibold text-[15px] leading-tight">{d.title}</div>
                <div className="text-xs opacity-80">{d.desc}</div>
              </div>
              <div className="mt-3 h-8 w-8 rounded-full bg-white text-[#0F172A] grid place-items-center text-sm">▶</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-[#EFF6FF] text-[#0E7C3A] border border-[#BFDBFE]">9:16 Reels</span>
          <span className="px-2.5 py-1 rounded-full bg-white border">16:9 YouTube</span>
          <span className="px-2.5 py-1 rounded-full bg-white border">1:1 Square</span>
          <span className="px-2.5 py-1 rounded-full bg-white border hidden sm:inline">4K export</span>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-4 md:px-6 mt-6 pb-28">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-6 items-start">
          <form onSubmit={start} className="rounded-[24px] border border-zinc-200 bg-white p-5 md:p-6 space-y-4">
            <div>
              <label className="block text-[13px] font-semibold mb-1.5">Bangla prompt</label>
              <textarea
                value={promptBn}
                onChange={(e) => setPromptBn(e.target.value)}
                required
                rows={3}
                className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-[14px] focus:outline-none focus:border-[#0E7C3A] focus:ring-2 focus:ring-[#0E7C3A]/15"
                placeholder="একটি কটন পাঞ্জাবির ১৫ সেকেন্ড অ্যাড, বাজারের ব্যাকগ্রাউন্ড, সাবটাইটল সহ"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-medium mb-1">Style</label>
                <select value={style} onChange={(e) => setStyle(e.target.value)} className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-[14px] bg-white">
                  <option value="ads">Ads</option>
                  <option value="reels">Reels</option>
                  <option value="tutorial">Tutorial</option>
                  <option value="promo">Promo</option>
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium mb-1">Aspect</label>
                <select value={aspect} onChange={(e) => setAspect(e.target.value)} className="w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-[14px] bg-white">
                  <option value="9:16">9:16 Reels/TikTok</option>
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
                placeholder="https://.../avatar.png"
              />
            </div>

            <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" checked={withBgm} onChange={(e) => setWithBgm(e.target.checked)} className="accent-[#0E7C3A]" /> BGM যোগ করুন (ACE-Step)</label>

            <button
              type="submit"
              disabled={loading || !promptBn.trim()}
              className="hidden lg:flex w-full bg-[#0E7C3A] hover:bg-[#0c6a32] disabled:bg-zinc-300 text-white font-semibold py-3 rounded-full transition text-[14px] items-center justify-center shadow-[0_10px_24px_-12px_#0E7C3A]"
            >
              {loading ? 'তৈরি হচ্ছে...' : 'ভিডিও জেনারেট করুন →'}
            </button>
          </form>

          <div className="space-y-4">
            <div className="rounded-[24px] border border-zinc-200 bg-white p-5">
              <h3 className="font-semibold">কেন Hostamar?</h3>
              <ul className="mt-3 text-sm space-y-2 text-zinc-600">
                <li>✓ InVideo Max $85 vs Hostamar Starter ৳2000 — Bangla-first</li>
                <li>✓ Pictory Pro $35 vs Hostamar ৳0 FREE — 10 videos/mo</li>
                <li>✓ Veed Lite $12 watermark-free — Hostamar FREE watermark-free</li>
                <li>✓ 500+ creators, 4.8★, bKash • Nagad • Rocket</li>
              </ul>
              <Link href="/pricing" data-ga="pricing_click" className="mt-4 inline-flex h-10 px-5 rounded-full bg-[#0F172A] text-white text-sm font-semibold items-center">Pricing ৳0/৳2000/৳3500 দেখুন →</Link>
            </div>
            {jobId ? (
              <div className="rounded-[24px] border border-zinc-200 bg-white p-5">
                <div className="flex items-center justify-between text-[13px] text-zinc-500">
                  <span className="truncate">Job: {jobId}</span>
                  <span className="font-medium ml-3 shrink-0" style={{ color: PRIMARY }}>{status}</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-zinc-100 overflow-hidden">
                  <div className="h-full transition-all" style={{ width: `${Math.round(progress * 100)}%`, background: PRIMARY }} />
                </div>
                {videoUrl && (
                  <div className="mt-4">
                    <video src={videoUrl} controls className="w-full rounded-xl" />
                    <a href={videoUrl} download className="mt-3 inline-flex h-11 items-center rounded-full px-6 font-semibold text-white" style={{ background: PRIMARY }}>4K ডাউনলোড</a>
                    <p className="mt-2 text-[12px] text-zinc-400">স্বয়ংক্রিয় মুছে যাবে ৭ দিন পরে</p>
                  </div>
                )}
                {error && <p className="mt-3 text-[13px] text-red-600">{error}</p>}
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-zinc-300 bg-[#F8FAFC] p-5 text-sm text-zinc-500">প্রম্পট দিন, তারপর এখানে প্রিভিউ দেখবেন — 90s 4K, Reels/YouTube/Square সব ফরম্যাট।</div>
            )}
          </div>
        </div>
      </section>

      <div className="lg:hidden fixed bottom-0 inset-x-0 p-3 bg-white/95 backdrop-blur border-t border-zinc-200 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">৳0 FREE — 10 videos/mo</span>
        <button onClick={start as unknown as () => void} disabled={loading || !promptBn.trim()} className="h-11 px-6 rounded-full bg-[#0E7C3A] text-white font-semibold disabled:bg-zinc-300">Generate →</button>
      </div>
    </div>
  )
}
