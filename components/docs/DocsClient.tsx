'use client'

/**
 * DocsClient — shared renderer for /docs (EN) and /docs/bn (বাংলা).
 * Content served from /api/docs?lang=… (2.5MB payload stays out of the JS bundle).
 */
import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Menu, X, Coins, Phone } from 'lucide-react'

const GREEN = '#0E7C3A'

type Section = { id: string; title: string; html: string }

export default function DocsClient({ lang }: { lang: 'en' | 'bn' }) {
  const [sections, setSections] = useState<Section[]>([])
  const [q, setQ] = useState('')
  const [active, setActive] = useState<string>('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/docs?lang=${lang}`)
      .then(r => r.json())
      .then(d => setSections(d.sections || []))
      .catch(() => setSections([]))
      .finally(() => setLoading(false))
  }, [lang])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return sections
    return sections.filter((s) => s.title.toLowerCase().includes(needle) || s.html.toLowerCase().includes(needle))
  }, [q, sections])

  // scroll-spy for the right TOC
  useEffect(() => {
    if (!sections.length) return
    const obs = new IntersectionObserver(
      (entries) => { for (const e of entries) { if (e.isIntersecting) setActive(e.target.id) } },
      { rootMargin: '-80px 0px -70% 0px' },
    )
    for (const s of sections) {
      const el = document.getElementById(s.id)
      if (el) obs.observe(el)
    }
    return () => obs.disconnect()
  }, [sections])

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      {/* ── Banner: 1cr=1TK=1COIN ── */}
      <div className="flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-semibold text-white" style={{ background: GREEN }}>
        <Coins className="h-3.5 w-3.5" />
        1cr = 1TK = 1 ভবিষ্যৎ HOST কয়েন — সাইনআপে 6000cr বোনাস = 6000 TK
        <span className="mx-2 opacity-70">•</span>
        <Phone className="h-3 w-3" /> bKash 01822417463
        <span className="mx-2 opacity-70">•</span>
        <span className="opacity-90">Starter ৳599→6000cr · Pro ৳1,299→13,000cr · Business ৳2,999→30,000cr</span>
      </div>

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-4 py-3">
          <button className="lg:hidden" onClick={() => setSidebarOpen(v => !v)} aria-label="Menu">
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded font-bold text-white" style={{ background: GREEN }}>H</span>
            <span className="font-bold">Hostamar Docs</span>
          </Link>
          <span className="hidden rounded-full bg-[#ECFDF5] px-2.5 py-0.5 text-[11px] font-semibold sm:inline" style={{ color: GREEN }}>
            106 Services • 120 Models • 79% cheaper than Fiverr
          </span>
          <div className="relative ml-auto hidden w-72 sm:block">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={lang === 'bn' ? 'ডকস সার্চ করুন…' : 'Search docs…'}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-sm focus:border-[#0E7C3A] focus:outline-none"
            />
          </div>
          <Link href="/dashboard" className="rounded-xl px-3 py-2 text-sm font-semibold text-white" style={{ background: GREEN }}>
            ড্যাশবোর্ড
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-8 px-4 py-8 lg:grid-cols-[270px_minmax(0,1fr)_220px]">
        {/* ── LEFT: sticky section nav ── */}
        <aside className={`z-30 lg:sticky lg:top-[64px] lg:block lg:h-[calc(100vh-90px)] lg:overflow-y-auto lg:pr-3 ${sidebarOpen ? 'fixed inset-x-0 top-[58px] bottom-0 overflow-y-auto bg-white p-4' : 'hidden'}`}>
          <p className="mb-2 text-xs font-bold text-zinc-400">{lang === 'bn' ? 'সেকশনস' : 'SECTIONS'}</p>
          <nav className="space-y-0.5 text-sm">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={() => setSidebarOpen(false)}
                className={`block truncate rounded-lg px-2.5 py-1.5 ${active === s.id ? 'bg-[#ECFDF5] font-semibold' : 'text-zinc-600 hover:bg-zinc-50'}`}
                style={active === s.id ? { color: GREEN } : undefined}
              >
                {s.title.length > 52 ? s.title.slice(0, 52) + '…' : s.title}
              </a>
            ))}
          </nav>
          <div className="mt-6 space-y-1 rounded-xl border p-3 text-xs">
            <p className="font-bold" style={{ color: GREEN }}>প্ল্যানস</p>
            <p className="text-zinc-600">Starter ৳599 → 6000cr</p>
            <p className="text-zinc-600">Pro ৳1,299 → 13,000cr</p>
            <p className="text-zinc-600">Business ৳2,999 → 30,000cr</p>
            <Link href="/dashboard/payment" className="mt-2 block rounded-lg px-2 py-1.5 text-center font-semibold text-white" style={{ background: GREEN }}>
              bKash টপ-আপ
            </Link>
          </div>
        </aside>

        {/* ── CENTER: content ── */}
        <main className="min-w-0">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">{lang === 'bn' ? 'হোস্টামার গ্রাহক ম্যানুয়াল — সম্পূর্ণ গাইড' : 'Hostamar Customer Manual — Complete Guide'}</h1>
            <p className="mt-1 text-sm text-zinc-500">
              106 AI সার্ভিস • 120 মডেল (token pricing market rate) • Orca ADE vibe coding • 1cr = 1TK = 1 ভবিষ্যৎ HOST কয়েন • 6000cr বোনাস
            </p>
          </div>
          {q && (
            <p className="mb-4 rounded-xl bg-[#ECFDF5] px-3 py-2 text-xs" style={{ color: GREEN }}>
              {lang === 'bn' ? 'সার্চ' : 'Search'}: “{q}” — {filtered.length} {lang === 'bn' ? 'সেকশন' : 'sections'}
            </p>
          )}
          {loading && <p className="py-10 text-center text-sm text-zinc-400">Loading…</p>}
          {filtered.map((s) => (
            <section key={s.id} id={s.id} className="docs-section mb-10 scroll-mt-24">
              <h2 className="mb-3 text-lg font-bold" style={{ color: GREEN }}>{s.title}</h2>
              <div className="docs-body text-[13.5px] leading-relaxed text-zinc-700" dangerouslySetInnerHTML={{ __html: s.html }} />
            </section>
          ))}
          {filtered.length === 0 && <p className="py-10 text-center text-sm text-zinc-400">{lang === 'bn' ? 'কিছু পাওয়া যায়নি — অন্য শব্দে চেষ্টা করুন' : 'Nothing found — try another word'}</p>}
        </main>

        {/* ── RIGHT: TOC (active section) ── */}
        <aside className="sticky top-[64px] hidden h-[calc(100vh-90px)] overflow-y-auto xl:block">
          <p className="mb-2 text-xs font-bold text-zinc-400">{lang === 'bn' ? 'এই পেজে' : 'ON THIS PAGE'}</p>
          <nav className="space-y-1 text-[11px]">
            {sections.slice(0, 24).map((s) => (
              <a key={s.id} href={`#${s.id}`}
                className={`block truncate rounded px-2 py-1 ${active === s.id ? 'bg-[#ECFDF5] font-semibold' : 'text-zinc-500 hover:text-zinc-800'}`}
                style={active === s.id ? { color: GREEN } : undefined}>
                {s.title.length > 34 ? s.title.slice(0, 34) + '…' : s.title}
              </a>
            ))}
          </nav>
        </aside>
      </div>

      <footer className="border-t py-6 text-center text-xs text-zinc-400">
        Hostamar.com — 106 services, 120 models, Orca ADE — 1cr = 1TK = 1 future HOST coin — bKash 01822417463
      </footer>

      <style jsx global>{`
        .docs-body h3 { font-weight: 700; font-size: 15px; margin: 18px 0 8px; color: #18181B; }
        .docs-body h4 { font-weight: 600; font-size: 13.5px; margin: 14px 0 6px; color: #27272A; }
        .docs-body .docs-p { margin: 8px 0; }
        .docs-body .docs-ul { list-style: disc; padding-left: 20px; margin: 8px 0; }
        .docs-body .docs-ol { list-style: decimal; padding-left: 20px; margin: 8px 0; }
        .docs-body .docs-hr { border: 0; border-top: 1px solid #e4e4e7; margin: 18px 0; }
        .docs-body .docs-code { background: #f4f4f5; border-radius: 4px; padding: 1px 5px; font-size: 12px; font-family: ui-monospace, monospace; color: #0E7C3A; }
        .docs-body .docs-pre { background: #18181B; color: #d4d4d8; border-radius: 10px; padding: 12px; overflow-x: auto; font-size: 11.5px; font-family: ui-monospace, monospace; margin: 10px 0; line-height: 1.5; white-space: pre-wrap; }
        .docs-body .docs-a { color: #0E7C3A; font-weight: 500; }
        .docs-body strong { color: #09090B; }
      `}</style>
    </div>
  )
}
