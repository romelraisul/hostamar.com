'use client'

// Bazaar Poster FAQ (Direction C, 2026-09). All logic preserved from the previous
// version: search, category filter, '/' shortcut, auto-open, JSON-LD, real
// WhatsApp/email/call links. Only presentation restyled.

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Search, ChevronDown, MessageCircle, Mail, Phone, Clock } from 'lucide-react'
import { FAQS, FAQ_CATS, type FaqCat } from '@/lib/faqs'

const WHATSAPP = 'https://wa.me/8801822417463?text=হ্যাঁ,%20আমি%20সাহায্য%20চাই'
const EMAIL = 'mailto:support@hostamar.com'
const CALL = 'tel:+880****7463'

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
    <div className="bp-theme">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="bp-page-hero">
        <div className="bp-wrap">
          <h1>
            সচরাচর <span style={{ color: 'var(--bp-green)' }}>জিজ্ঞাসা</span>
          </h1>
          <p>bKash, ভিডিও, হোস্টিং, চ্যাট, আপনার সব প্রশ্নের উত্তর বাংলায়। ২ ক্লিকে উত্তর পান</p>
          <div className="bp-stamp-row" style={{ marginTop: '1.1rem' }}>
            <span className="bp-stamp">২৪/৭ সাপোর্ট</span>
            <span className="bp-stamp">গড় উত্তর ১২ মিনিট</span>
            <span className="bp-stamp">৪.৮ রেটিং</span>
            <span className="bp-stamp">Made for Bangladesh</span>
          </div>
        </div>
      </div>

      <section className="bp-sec" style={{ paddingTop: '1.6rem' }}>
        <div className="bp-wrap">
          <div className="relative">
            <Search style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 20, height: 20, color: 'var(--bp-ink-soft)', pointerEvents: 'none' }} aria-hidden="true" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="প্রশ্ন খুঁजুন... যেমন bKash পেমেন্ট"
              aria-label="প্রশ্ন খুঁজুন"
              className="bp-search"
            />
            <kbd className="bp-kbd">/</kbd>
          </div>

          <div className="bp-pill-row">
            {CATS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCat(c.key)}
                className={`bp-pill ${cat === c.key ? 'bp-pill-on' : ''}`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="bp-faq-grid">
            <div>
              <p className="bp-muted" style={{ fontSize: '.85rem', marginBottom: '.7rem' }}>{filtered.length} টি প্রশ্ন</p>
              <div className="bp-faq">
                {filtered.length === 0 && (
                  <div className="bp-faq-empty">
                    <p>কোনো মিল পাওয়া যায়নি। নিচের WhatsApp / ইমেইল করুন।</p>
                    <Link href="/contact" style={{ fontWeight: 600, color: 'var(--bp-green)' }}>যোগাযোগ করুন</Link>
                  </div>
                )}
                {filtered.map((f) => {
                  const open = openId === f.id
                  return (
                    <details key={f.id} open={open} onToggle={(e) => { const el = e.currentTarget; if (el.open) setOpenId(f.id); else if (openId === f.id) setOpenId(null) }}>
                      <summary>
                        {f.q}
                        <ChevronDown size={18} strokeWidth={1.7} aria-hidden="true" style={{ flex: 'none', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .25s var(--bp-ease)' }} />
                      </summary>
                      <p>
                        {f.a}
                        {f.link && (
                          <Link href={f.link.href} style={{ display: 'inline-flex', marginTop: '.5rem', fontWeight: 600, color: 'var(--bp-green)' }}>
                            {f.link.label}
                          </Link>
                        )}
                      </p>
                    </details>
                  )
                })}
              </div>
            </div>

            <aside className="bp-faq-side">
              <div className="bp-faq-side-card">
                <p style={{ fontFamily: 'var(--font-bn)', fontWeight: 700, fontSize: '1rem', color: 'var(--bp-ink)' }}>উত্তর পাননি?</p>
                <p style={{ fontSize: '.85rem', color: 'var(--bp-ink-soft)', marginTop: '.2rem' }}>১২ মিনিটের মধ্যে রিয়েল মানুষ উত্তর দেয়।</p>
                <div style={{ display: 'grid', gap: '.5rem', marginTop: '.9rem' }}>
                  <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="bp-btn bp-btn-primary" style={{ padding: '.7rem 1rem', fontSize: '.92rem' }}>
                    <MessageCircle size={18} strokeWidth={1.7} aria-hidden="true" /> WhatsApp করুন
                  </a>
                  <a href={EMAIL} className="bp-btn bp-btn-ghost" style={{ padding: '.7rem 1rem', fontSize: '.92rem' }}>
                    <Mail size={18} strokeWidth={1.7} aria-hidden="true" style={{ color: 'var(--bp-green)' }} /> ইমেইল লিখুন
                  </a>
                  <a href={CALL} className="bp-btn bp-btn-ghost" style={{ padding: '.7rem 1rem', fontSize: '.92rem' }}>
                    <Phone size={18} strokeWidth={1.7} aria-hidden="true" style={{ color: 'var(--bp-green)' }} /> কল করুন
                  </a>
                </div>
                <div className="bp-faq-side-note">
                  <Clock size={16} strokeWidth={1.7} aria-hidden="true" style={{ color: 'var(--bp-green)' }} />
                  <span>গড় উত্তর ১২ মিনিট, কোনো বট নয়</span>
                </div>
              </div>
              <div className="bp-faq-side-card">
                <p style={{ fontFamily: 'var(--font-bn)', fontWeight: 700, fontSize: '1rem', color: 'var(--bp-ink)' }}>জনপ্রিয় নিবন্ধ</p>
                <ul style={{ display: 'grid', gap: '.45rem', marginTop: '.55rem', fontSize: '.92rem' }}>
                  <li><Link href="/hosting">হোস্টিং মাইগ্রেশন গাইড</Link></li>
                  <li><Link href="/browser">YouTube summary গাইড</Link></li>
                  <li><Link href="/pricing">প্ল্যান কীভাবে বাছবেন</Link></li>
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
