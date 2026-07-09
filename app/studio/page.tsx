'use client'

import { useState } from 'react'
import Link from 'next/link'
import Timeline, { type Scene } from '@/components/studio/Timeline'

const TEMPLATE_FILTERS = ['সব', 'ঈদ', 'পহেলা বৈশাখ', 'ব্যবসা', 'ইসলামিক'] as const
const TEMPLATES = [
  { id: 't1', name: 'ঈদ অফার - বিরিয়ানি', tag: 'ঈদ', color: '#0E7C3A' },
  { id: 't2', name: 'পহেলা বৈশাখ', tag: 'পহেলা বৈশাখ', color: '#E4312B' },
  { id: 't3', name: 'ব্যবসা প্রোমো', tag: 'ব্যবসা', color: '#2563EB' },
  { id: 't4', name: 'ইসলামিক নতুন বছর', tag: 'ইসলামিক', color: '#0E7C3A' },
  { id: 't5', name: 'স্পেশাল রিজার্ভ', tag: 'ঈদ', color: '#0E7C3A' },
  { id: 't6', name: 'ফেস্টিভ ডিসকাউন্ট', tag: 'পহেলা বৈশাখ', color: '#E4312B' },
]

const SIDEBAR = ['Templates', 'Uploads', 'Brand Kit', 'Music'] as const

export default function StudioPage() {
  const [projectName] = useState('ঈদ অফার - বিরিয়ানি হাউস')
  const [quality] = useState<'720p' | '1080p' | '4K'>('1080p')
  const [ratio] = useState<'9:16' | '1:1' | '16:9'>('9:16')
  const [tab, setTab] = useState<(typeof SIDEBAR)[number]>('Templates')
  const [filter, setFilter] = useState<(typeof TEMPLATE_FILTERS)[number]>('সব')
  const [rightTab, setRightTab] = useState<'Script' | 'Voice' | 'Style' | 'Brand'>('Script')
  const [script, setScript] = useState(
    'ঈদের স্পেশাল অফার - ৫০% ছাড়! বিরিয়ানি হাউসে আজই আসুন।'
  )
  const [exporting, setExporting] = useState(false)
  const [exportPct, setExportPct] = useState(0)
  const [exportJobId, setExportJobId] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  const [scenes, setScenes] = useState<Scene[]>([
    { id: 'intro', title: 'Intro', duration: 5, color: '#0E7C3A' },
    { id: 'offer', title: 'Offer', duration: 15, color: '#E4312B' },
    { id: 'cta', title: 'Cta', duration: 10, color: '#2563EB' },
  ])

  // Wire Export to the REAL ComfyUI pipeline (BullMQ + VideoQueue + workers/video-generation.ts).
  // POST /api/queue/generate -> { jobId }, then poll /api/queue/status/[jobId].
  const runExport = async () => {
    setExporting(true)
    setExportPct(0)
    setExportError(null)
    try {
      const totalDuration = scenes.reduce((s, x) => s + x.duration, 0)
      const res = await fetch('/api/queue/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script,
          style: 'modern',
          voiceOver: 'নারী কণ্ঠ - সুমাইয়া',
          duration: totalDuration,
        }),
      })
      if (res.status === 401) {
        window.location.href = '/signup'
        return
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Export failed')
      }
      const { jobId } = await res.json()
      setExportJobId(jobId)

      // Poll status (queued -> processing -> complete)
      const iv = setInterval(async () => {
        try {
          const st = await fetch(`/api/queue/status/${jobId}`).then((r) => r.json())
          const pct =
            st.status === 'queued'
              ? 10
              : st.status === 'processing'
              ? Math.max(20, Math.min(95, (st.progress || 0) + 20))
              : 100
          setExportPct(pct)
          if (st.status === 'complete') {
            clearInterval(iv)
            setExportPct(100)
            window.location.href = `/studio/export/${jobId}`
          } else if (st.status === 'failed') {
            clearInterval(iv)
            setExportError(st.error || 'Render failed')
          }
        } catch {
          /* transient poll error — keep waiting */
        }
      }, 1500)
    } catch (e: any) {
      setExporting(false)
      setExportError(e.message || 'Export failed')
    }
  }

  const visibleTemplates =
    filter === 'সব' ? TEMPLATES : TEMPLATES.filter((t) => t.tag === filter)

  return (
    <div className="flex h-screen flex-col bg-[#0E0F13] text-zinc-200">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-bold text-white">
            Hostamar<span className="text-[#0E7C3A]">.</span>
          </Link>
          <span className="text-sm text-zinc-400">{projectName}</span>
          <span className="rounded-full bg-[#0E7C3A]/20 px-2 py-0.5 text-xs text-[#0E7C3A]">
            Saved
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-white/10 text-xs">
            {(['720p', '1080p', '4K'] as const).map((q) => (
              <span
                key={q}
                className={`px-2 py-1 ${quality === q ? 'bg-[#0E7C3A] text-white' : 'text-zinc-400'}`}
              >
                {q}
              </span>
            ))}
          </div>
          <div className="flex overflow-hidden rounded-lg border border-white/10 text-xs">
            {(['9:16', '1:1', '16:9'] as const).map((r) => (
              <span
                key={r}
                className={`px-2 py-1 ${ratio === r ? 'bg-[#0E7C3A] text-white' : 'text-zinc-400'}`}
              >
                {r}
              </span>
            ))}
          </div>
          <button
            onClick={runExport}
            className="rounded-lg bg-[#0E7C3A] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[#0A5A2B]"
          >
            Export
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar 280px */}
        <aside className="w-[280px] shrink-0 border-r border-white/10 bg-[#121419] p-3">
          {SIDEBAR.map((s) => (
            <button
              key={s}
              onClick={() => setTab(s)}
              className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm ${
                tab === s ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5'
              }`}
            >
              {s}
            </button>
          ))}
          {tab === 'Templates' && (
            <div className="mt-3">
              <div className="mb-2 flex flex-wrap gap-1">
                {TEMPLATE_FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      filter === f ? 'bg-[#0E7C3A] text-white' : 'bg-white/5 text-zinc-400'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {visibleTemplates.map((t) => (
                  <div
                    key={t.id}
                    className="cursor-pointer rounded-lg border-2 border-transparent p-2 text-center text-xs hover:border-[#0E7C3A]"
                    style={{ background: t.color + '22' }}
                  >
                    <div
                      className="mb-1 h-14 rounded"
                      style={{ background: t.color + '55' }}
                    />
                    {t.name}
                  </div>
                ))}
              </div>
            </div>
          )}
          {tab === 'Brand Kit' && (
            <div className="mt-3 rounded-lg border border-dashed border-white/20 p-4 text-center text-xs text-zinc-500">
              লোগো নেই?{' '}
              <Link href="/chat" className="text-[#0E7C3A] underline">
                AI Logo বানান
              </Link>
            </div>
          )}
          {tab === 'Uploads' && (
            <p className="mt-3 text-xs text-zinc-500">আপলোড করা ফাইল এখানে দেখাবে।</p>
          )}
          {tab === 'Music' && (
            <p className="mt-3 text-xs text-zinc-500">ব্যাকগ্রাউন্ড মিউজিক লাইব্রেরি।</p>
          )}
        </aside>

        {/* Center canvas */}
        <main className="flex flex-1 items-center justify-center p-6">
          <div
            className={`relative flex items-center justify-center overflow-hidden rounded-xl bg-black ${
              ratio === '9:16'
                ? 'aspect-[9/16] w-[320px]'
                : ratio === '1:1'
                ? 'aspect-square w-[420px]'
                : 'aspect-video w-[560px]'
            }`}
          >
            <span className="rounded bg-[#0E7C3A]/90 px-3 py-1 text-center text-lg font-bold text-white">
              ঈদের স্পেশাল অফার - ৫০% ছাড়
            </span>
            {/* Badge: Bengali render check (Noto Sans Bengali) */}
            <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
              Noto Sans Bengali ✓
            </span>
          </div>
        </main>

        {/* Right panel 340px */}
        <aside className="w-[340px] shrink-0 border-l border-white/10 bg-[#121419] p-4">
          <div className="mb-3 flex gap-1 text-xs">
            {(['Script', 'Voice', 'Style', 'Brand'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setRightTab(t)}
                className={`flex-1 rounded-lg py-1.5 ${
                  rightTab === t ? 'bg-[#0E7C3A] text-white' : 'bg-white/5 text-zinc-400'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {rightTab === 'Script' && (
            <div>
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                rows={6}
                className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-zinc-100 outline-none"
              />
              <div className="mt-1 flex items-center justify-between text-xs text-zinc-500">
                <span>{script.length} chars</span>
                <button className="rounded bg-[#0E7C3A] px-3 py-1 font-semibold text-white">
                  স্ক্রিপ্ট আননত করুন
                </button>
              </div>
            </div>
          )}
          {rightTab === 'Voice' && (
            <div className="space-y-3 text-sm">
              <label className="block text-zinc-400">ভয়েস</label>
              <select className="w-full rounded-lg border border-white/10 bg-black/30 p-2 text-zinc-100">
                <option>নারী কণ্ঠ - সুমাইয়া</option>
                <option>পুরুষ কণ্ঠ - আরিয়ান</option>
              </select>
              <label className="block text-zinc-400">স্পিড</label>
              <input type="range" min={0.5} max={2} step={0.1} defaultValue={1} className="w-full" />
            </div>
          )}
          {rightTab === 'Style' && (
            <div className="space-y-2 text-sm text-zinc-300">
              {['Pop', 'Minimal', 'Bold'].map((s) => (
                <div key={s} className="flex items-center gap-2 rounded-lg border border-white/10 p-2">
                  <input type="radio" name="style" /> {s}
                </div>
              ))}
            </div>
          )}
          {rightTab === 'Brand' && (
            <p className="text-xs text-zinc-500">লোগো পজিশন ও কালার সেট করুন।</p>
          )}

          {/* Export progress (ComfyUI GPU rendering) */}
          {exporting && (
            <div className="mt-4 rounded-lg bg-black/40 p-3">
              <p className="text-xs text-zinc-300">
                Exporting {exportPct}% — ComfyUI GPU rendering
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-white/10">
                <div
                  className="h-full bg-[#0E7C3A] transition-all"
                  style={{ width: `${exportPct}%` }}
                />
              </div>
              {exportError && <p className="mt-2 text-xs text-[#E4312B]">{exportError}</p>}
              {exportJobId && !exportError && (
                <Link
                  href="/hosting"
                  className="mt-2 inline-block text-xs text-[#0E7C3A] underline"
                >
                  এই ভিডিওর জন্য ল্যান্ডিং পেজ বানাবেন? এক ক্লিকে হোস্ট করুন
                </Link>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* Timeline */}
      <div className="border-t border-white/10">
        <Timeline scenes={scenes} setScenes={setScenes} />
      </div>
    </div>
  )
}
