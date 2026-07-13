'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Search, ChevronDown, MessageCircle, Mail, Phone, Clock, HelpCircle } from 'lucide-react'
import { FAQS, FAQ_CATS, type FaqCat } from '@/lib/faqs'

const GREEN = '#0E7C3A'
const WHATSAPP = 'https://wa.me/8801822417463?text=হ্যাঁ,%20আমি%20সাহায্য%20চাই'
const EMAIL = 'mailto:support@hostamar.com'
const CALL = 'tel:+880****7463'

const CATS = FAQ_CATS

export default function FaqPage() {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<'all' | FaqCat>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return FAQS.filter((f) => {
      const catOk = cat === 'all' || f.cat === cat
      const qOk = !q || f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)
      return catOk && qOk
    })
  }, [query, cat])

  // `/` shortcut focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !/input|textarea/i.test((e.target as HTMLElement)?.tagName || '')) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // live filter opens first result
  useEffect(() => {
    setOpenId(filtered.length ? filtered[0].id : null)
  }, [filtered])

  const jsonLd = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }), [])

  return (
    <div className="min-h-screen bg-[#FCFCF9] text-zinc-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* trust banner */}
      <div className="w-full bg-[#0E7C3A] text-white text-[12px] md:text-[13px] leading-none">
        <div className="mx-auto max-w-[1180px] px-4 md:px-6 h-9 flex items-center justify-between gap-2">
          <div className="flex items-center gap-4 md:gap-6 font-medium">
            <span className="flex items-center gap-1.5"><HelpCircle className="w-3.5 h-3.5 opacity-90" /> ২৪/৭ সাপোর্ট</span>
            <span className="hidden sm:inline-flex items-center gap-1.5">গড় উত্তর ১২ মিনিট</span>
            <span className="inline-flex items-center gap-1.5">৪.৮ রেটিং</span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 font-semibold tracking-wide">🇧🇩 Made for Bangladesh</span>
        </div>
      </div>

      {/* hero */}
      <section className="mx-auto max-w-[1180px] px-4 md:px-6 pt-12 md:pt-16 pb-6 text-center">
        <h1 className="bangla text-[32px] md:text-[46px] font-bold tracking-[-0.03em] leading-[1.08]">
          সচরাচর <span style={{ color: GREEN }}>জিজ্ঞাসা</span>
        </h1>
        <p className="bangla mt-3 text-[15px] md:text-[17px] text-zinc-500 max-w-[620px] mx-auto">
          bKash, ভিডিও, হোস্টিং, চ্যাট — আপনার সব প্রশ্নের উত্তর বাংলায়। ২ ক্লিকে উত্তর পান।
        </p>
      </section>

      {/* search + pills */}
      <div className="mx-auto max-w-[1180px] px-4 md:px-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="প্রশ্ন খুঁজুন... যেমন bKash পেমেন্ট"
            className="w-full rounded-2xl border border-zinc-200 bg-white py-3.5 pl-12 pr-16 text-[15px] outline-none focus:border-[#0E7C3A] focus:ring-2 focus:ring-[#0E7C3A]/20"
          />
          <kbd className="absolute right-4 top-1/2 -translate-y-1/2 rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-400">/</kbd>
        </div>
        <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto pb-1">
          {CATS.map((c) => (
            <button key={c.key} onClick={() => setCat(c.key)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-[14px] font-medium transition ${cat === c.key ? 'bg-[#0E7C3A] text-white shadow' : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100'}`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* list + sidebar */}
      <div className="mx-auto max-w-[1180px] px-4 md:px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            <p className="bangla mb-3 text-[13px] font-medium text-zinc-400">{filtered.length} টি প্রশ্ন</p>
            <div className="space-y-3">
              {filtered.length === 0 && (
                <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
                  <p className="bangla text-[15px] text-zinc-500">কোনো মিল পাওয়া যায়নি। নিচের WhatsApp / ইমেইল করুন।</p>
                  <Link href="/contact" className="bangla mt-3 inline-block font-semibold text-[#0E7C3A]">যোগাযোগ করুন →</Link>
                </div>
              )}
              {filtered.map((f) => {
                const open = openId === f.id
                return (
                  <div key={f.id} className={`overflow-hidden rounded-2xl border bg-white transition ${open ? 'border-[#0E7C3A]/40 ring-1 ring-[#0E7C3A]/20' : 'border-zinc-200'}`}>
                    <button onClick={() => setOpenId(open ? null : f.id)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
                      <span className="bangla text-[15px] font-semibold leading-snug">{f.q}</span>
                      <ChevronDown className={`h-5 w-5 shrink-0 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                    {open && (
                      <div className="px-5 pb-5">
                        <p className="bangla text-[14px] leading-6 text-zinc-600">{f.a}</p>
                        {f.link && (
                          <Link href={f.link.href} className="bangla mt-3 inline-flex items-center gap-1 text-[14px] font-semibold text-[#0E7C3A]">
                            {f.link.label} →
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          {/* SIDEBAR */}
          <aside className="hidden lg:block">
            <div className="sticky top-[96px] space-y-4">
              <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                <p className="bangla text-[15px] font-bold">উত্তর পাননি?</p>
                <p className="bangla mt-1 text-[13px] text-zinc-500">১২ মিনিটের মধ্যে রিয়েল মানুষ উত্তর দেয়।</p>
                <div className="mt-4 space-y-2">
                  <a href={WHATSAPP} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl bg-[#0E7C3A] px-4 py-3 text-[14px] font-semibold text-white transition hover:bg-[#0c6c33]">
                    <MessageCircle className="h-5 w-5" /> WhatsApp করুন
                  </a>
                  <a href={EMAIL}
                    className="flex items-center gap-3 rounded-xl border border-zinc-200 px-4 py-3 text-[14px] font-semibold text-zinc-700 transition hover:bg-zinc-50">
                    <Mail className="h-5 w-5 text-[#0E7C3A]" /> ইমেইল লিখুন
                  </a>
                  <a href={CALL}
                    className="flex items-center gap-3 rounded-xl border border-zinc-200 px-4 py-3 text-[14px] font-semibold text-zinc-700 transition hover:bg-zinc-50">
                    <Phone className="h-5 w-5 text-[#0E7C3A]" /> কল করুন
                  </a>
                </div>
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#0E7C3A]/8 p-3 text-[13px] text-zinc-600">
                  <Clock className="h-4 w-4 text-[#0E7C3A]" />
                  <span className="bangla">গড় উত্তর ১২ মিনিট • কোনো বট নয়</span>
                </div>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                <p className="bangla text-[15px] font-bold">জনপ্রিয় নিবন্ধ</p>
                <ul className="mt-3 space-y-2 text-[14px]">
                  <li><Link href="/hosting" className="bangla text-zinc-600 hover:text-[#0E7C3A]">হোস্টিং মাইগ্রেশন গাইড</Link></li>
                  <li><Link href="/browser" className="bangla text-zinc-600 hover:text-[#0E7C3A]">YouTube summary গাইড</Link></li>
                  <li><Link href="/pricing" className="bangla text-zinc-600 hover:text-[#0E7C3A]">প্ল্যান কীভাবে বাছবেন</Link></li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
