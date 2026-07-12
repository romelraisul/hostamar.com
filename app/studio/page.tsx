'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import Timeline, { type Scene } from '@/components/studio/Timeline'

const TEMPLATE_FILTERS = ['সব', 'ঈদ', 'পহেলা বৈশাখ', 'ব্যবসা', 'ইসলামিক'] as const
const TEMPLATES = [
  { id: 't1', name: 'ঈদ অফার - বিরিয়ানি', tag: 'ঈদ', color: '#0E7C3A' },
  { id: 't2', name: 'পহেলা বৈশাখ', tag: 'পহেলা বৈশাখ', color: '#E4312B' },
  { id: 't3', name: 'ব্যবসা প্রোমো', tag: 'ব্যবসা', color: '#2563EB' },
  { id: 't4', name: 'ইসলামিক নতু�র', tag: 'ইসলামিক', color: '#0E7C3A' },
  { id: 't5', name: 'স্পেশাল রিজার্ভ', tag: 'ঈদ', color: '#0E7C3A' },
  { id: 't6', name: 'ফেস্টিভ ডিসকাউন্ট', tag: 'পহেলা বৈশাখ', color: '#E4312B' },
]

const SIDEBAR = ['Templates', 'Uploads', 'Brand Kit', 'Music'] as const
const QUALITIES = ['720p', '1080p', '4K'] as const
const RATIOS = ['9:16', '1:1', '16:9'] as const
const CAPTION_STYLES = ['Pop', 'Minimal', 'Bold'] as const

export default function StudioPage() {
  const [projectName] = useState('ঈদ অফার - বিরিয়ানি হাউস')
  const [quality, setQuality] = useState<'720p' | '1080p' | '4K'>('1080p')
  const [ratio, setRatio] = useState<'9:16' | '1:1' | '16:9'>('9:16')
  const [tab, setTab] = useState<(typeof SIDEBAR)[number]>('Templates')
  const [filter, setFilter] = useState<(typeof TEMPLATE_FILTERS)[number]>('সব')
  const [rightTab, setRightTab] = useState<'Script' | 'Voice' | 'Style' | 'Brand'>('Script')
  const [script, setScript] = useState(
    'ঈদের স্পেশাল অফার - ৫০% ছাড়! বিরিয়ানি হাউসে আজই আসুন।'
  )
  const [voice, setVoice] = useState('নারী কণ্ঠ - সুমাইয়া')
  const [speed, setSpeed] = useState(1)
  const [captionStyle, setCaptionStyle] = useState<(typeof CAPTION_STYLES)[number]>('Pop')
  const [brandLogo, setBrandLogo] = useState('bottom-right')

  // Timeline
  const [scenes, setScenes] = useState<Scene[]>([
    { id: 'intro', title: 'Intro', duration: 5, color: '#0E7C3A' },
    { id: 'offer', title: 'Offer', duration: 15, color: '#E4312B' },
    { id: 'cta', title: 'Cta', duration: 10, color: '#2563EB' },
  ])
  const [selectedScene, setSelectedScene] = useState<string | null>('offer')
  const [sheetOpen, setSheetOpen] = useState(false)

  // Export modal (real ComfyUI pipeline: /api/queue/generate -> poll /api/queue/status/[jobId])
  const [exporting, setExporting] = useState(false)
  const [exportPct, setExportPct] = useState(0)
  const [exportJobId, setExportJobId] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  const totalDuration = scenes.reduce((s, x) => s + x.duration, 0)

  const runExport = async () => {
    setExporting(true)
    setExportPct(0)
    setExportError(null)
    try {
      const res = await fetch('/api/queue/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script,
          style: captionStyle.toLowerCase(),
          voiceOver: voice,
          duration: totalDuration,
          ratio,
          quality,
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
      <header className="flex h-[56px] shrink-0 items-center justify-between border-b border-white/[0.07] px-3 lg:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#0E7C3A] font-bold text-[13px] text-white">
              H
            </span>
            <span className="hidden text-sm font-semibold tracking-tight sm:block">
              Hostamar Studio
            </span>
          </Link>
          <div className="hidden min-w-0 items-center gap-2 border-l border-white/10 pl-3 lg:flex">
            <span className="bangla max-w-[200px] truncate text-[13px] font-medium">
              {projectName}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.06] px-2 py-0.5 text-[11px] text-zinc-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Saved
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 lg:gap-3">
          <div className="hidden items-center rounded-full border border-white/[0.06] bg-[#171A20] p-1 md:flex">
            {QUALITIES.map((q) => (
              <button
                key={q}
                onClick={() => setQuality(q)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                  quality === q ? 'bg-white text-black' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
          <div className="hidden items-center rounded-full border border-white/[0.06] bg-[#171A20] p-1 md:flex">
            {RATIOS.map((r) => (
              <button
                key={r}
                onClick={() => setRatio(r)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                  ratio === r ? 'bg-white text-black' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <button
            onClick={runExport}
            disabled={exporting}
            className="rounded-full bg-[#0E7C3A] px-4 py-1.5 text-[13px] font-semibold text-white transition hover:bg-[#0A5A2B] disabled:opacity-60"
          >
            {exporting ? `Exporting ${exportPct}%` : 'Export'}
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left sidebar 280px */}
        <aside className="hidden w-[280px] shrink-0 flex-col border-r border-white/10 bg-[#121419] p-3 md:flex">
          {SIDEBAR.map((s) => (
            <button
              key={s}
              onClick={() => setTab(s)}
              className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm ${
                tab === s ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5'
              }`}
            >
              {s === 'Brand Kit' ? 'Brand Kit' : s}
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
                    <div className="mb-1 h-14 rounded" style={{ background: t.color + '55' }} />
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

          {/* GPU node status (matches your demo's sidebar chip) */}
          <div className="mt-auto rounded-xl border border-white/[0.06] bg-[#0F1115] p-3">
            <div className="text-[11px] text-zinc-500">GPU Node</div>
            <div className="mt-1 flex items-center gap-2 text-[13px] font-medium">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#22C55E]" />
              hostamar-comfyui:8188
            </div>
            <div className="mt-1 text-[11px] text-zinc-500">standby • VRAM idle</div>
          </div>
        </aside>

        {/* Center canvas */}
        <main className="flex min-w-0 flex-1 items-center justify-center p-6">
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
            <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
              Noto Sans Bengali ✓
            </span>
            <span className="absolute right-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[11px] text-zinc-300">
              {quality} • {ratio}
            </span>
          </div>
        </main>

        {/* Right panel 340px */}
        <aside className="hidden w-[340px] shrink-0 flex-col border-l border-white/10 bg-[#121419] p-4 lg:flex">
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
                  স্ক্রিপ্ট উন্নত করুন
                </button>
              </div>
            </div>
          )}

          {rightTab === 'Voice' && (
            <div className="space-y-3 text-sm">
              <label className="block text-zinc-400">ভয়েস</label>
              <select
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/30 p-2 text-zinc-100"
              >
                <option>নারী কণ্ঠ - সুমাইয়া</option>
                <option>পুরুষ কণ্ঠ - আরিয়ান</option>
              </select>
              <label className="block text-zinc-400">স্পিড</label>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-full"
              />
              <span className="text-xs text-zinc-500">{speed.toFixed(1)}x</span>
            </div>
          )}

          {rightTab === 'Style' && (
            <div className="space-y-2 text-sm text-zinc-300">
              <div className="text-xs text-zinc-500">Caption style</div>
              {CAPTION_STYLES.map((s) => (
                <button
                  key={s}
                  onClick={() => setCaptionStyle(s)}
                  className={`flex w-full items-center gap-2 rounded-lg border p-2 text-left ${
                    captionStyle === s ? 'border-[#0E7C3A] bg-[#0E7C3A]/10' : 'border-white/10'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {rightTab === 'Brand' && (
            <div className="space-y-3 text-sm">
              <label className="block text-zinc-400">লোগো পজিশন</label>
              <select
                value={brandLogo}
                onChange={(e) => setBrandLogo(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/30 p-2 text-zinc-100"
              >
                <option value="bottom-right">নিচে ডানে</option>
                <option value="bottom-left">নিচে বামে</option>
                <option value="top-right">উপরে ডানে</option>
                <option value="center">মাঝখানে</option>
              </select>
            </div>
          )}
        </aside>
      </div>

      {/* Timeline — desktop inline, mobile bottom sheet */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0F1115] transition-transform md:relative md:z-0 md:translate-y-0 ${
          sheetOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-1.5 md:hidden">
          <span className="text-[12px] font-medium">Timeline</span>
          <button onClick={() => setSheetOpen(false)} className="text-xs text-zinc-400">
            Close ✕
          </button>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5">
          <span className="text-[11px] text-zinc-500">
            {scenes.length} scenes • {totalDuration}s
          </span>
          <button
            onClick={() =>
              setScenes((prev) => [
                ...prev,
                {
                  id: 'scene-' + (prev.length + 1) + '-' + Date.now(),
                  title: 'New Scene',
                  duration: 5,
                  color: '#0E7C3A',
                },
              ])
            }
            className="rounded-md border border-white/15 px-2 py-1 text-[11px] text-zinc-300 hover:bg-white/5"
          >
            + Scene
          </button>
          <button
            disabled={!selectedScene}
            onClick={() => {
              if (!selectedScene) return
              setScenes((prev) => {
                const idx = prev.findIndex((s) => s.id === selectedScene)
                if (idx < 0) return prev
                const sc = prev[idx]
                const half = Math.max(2, Math.round(sc.duration / 2))
                const a: Scene = { ...sc, id: sc.id + '-a', duration: half }
                const b: Scene = { ...sc, id: sc.id + '-b', duration: sc.duration - half }
                const next = [...prev]
                next.splice(idx, 1, a, b)
                return next
              })
            }}
            className="rounded-md border border-white/15 px-2 py-1 text-[11px] text-zinc-300 hover:bg-white/5 disabled:opacity-40"
          >
            Split
          </button>
        </div>
        <div onMouseDown={() => setSheetOpen(true)} className="md:hidden" />
        <Timeline
          scenes={scenes}
          setScenes={setScenes}
          selectedId={selectedScene}
          onSelect={setSelectedScene}
        />
      </div>

      {/* Mobile: floating Timeline button */}
      <button
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full bg-[#171A20] px-4 py-2 text-[12px] font-medium text-zinc-200 shadow-lg ring-1 ring-white/10 md:hidden"
      >
        ▤ Timeline
      </button>

      {/* Export modal */}
      {exporting && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-[420px] rounded-2xl border border-white/10 bg-[#0F1115] p-6">
            <h2 className="text-base font-semibold">Exporting video</h2>
            <p className="mt-1 text-xs text-zinc-400">
              Exporting {exportPct}% — ComfyUI GPU rendering
            </p>
            <div className="mt-4 h-2 w-full overflow-hidden rounded bg-white/10">
              <div
                className="h-full bg-[#0E7C3A] transition-all"
                style={{ width: `${exportPct}%` }}
              />
            </div>
            {exportError && <p className="mt-3 text-xs text-[#E4312B]">{exportError}</p>}
            {exportJobId && !exportError && (
              <Link
                href="/hosting"
                className="mt-4 inline-block text-xs text-[#0E7C3A] underline"
              >
                এই ভিডিওর জন্য ল্যান্ডিং পেজ বানাবেন? এক ক্লিকে হোস্ট করুন
              </Link>
            )}
            {!exportError && (
              <button
                onClick={() => setExporting(false)}
                className="mt-4 block w-full rounded-lg border border-white/10 py-2 text-xs text-zinc-400"
              >
                ব্যাকগ্রাউন্ডে রান করুন
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
