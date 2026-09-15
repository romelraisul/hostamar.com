'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, Eye, Clock, Calendar, ArrowRight, Mail } from 'lucide-react'
import {
  POSTS, BLOG_CATS, FEATURED, POPULAR, formatViews,
  type BlogCat,
} from '@/lib/blog'
import BazaarNav from '@/components/home/BazaarNav'
import BazaarFooter from '@/components/home/BazaarFooter'

const GREEN = '#0E7C3A'

export default function BlogPage() {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<'all' | BlogCat>('all')
  const [subbed, setSubbed] = useState(false)
  const [email, setEmail] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return POSTS.filter((p) => {
      const catOk = cat === 'all' || p.category === cat
      const qOk =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      return catOk && qOk
    }).sort((a, b) => b.views - a.views)
  }, [query, cat])

  return (
    <div className="bp-theme min-h-screen bg-[#FBF4E4] text-[#1C1917]">
      <BazaarNav />

      {/* hero */}
      <div className="bp-page-hero">
        <div className="bp-wrap">
          <h1>
            হোস্টামার <span style={{ color: 'var(--bp-green)' }}>ব্লগ</span>
          </h1>
          <p>AI ভিডিও, ব্যবসা, মার্কেটিং ও টেকনোলজি — বাংলায়</p>
          <div className="bp-stamp-row" style={{ marginTop: '1.1rem' }}>
            <span className="bp-stamp">বাংলায় AI টিপস</span>
            <span className="bp-stamp">সাপ্তাহিক ১ ইমেইল</span>
            <span className="bp-stamp">Made for Bangladesh</span>
          </div>
        </div>
      </div>

      {/* search + pills */}
      <section className="bp-sec" style={{ paddingBottom: 0 }}>
        <div className="bp-wrap">
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 20, height: 20, color: 'var(--bp-ink-soft)', pointerEvents: 'none' }} aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ব্লগ খুঁজুন... যেমন bKash পেমেন্ট"
              aria-label="ব্লগ খুঁজুন"
              className="bp-search"
            />
          </div>
          <div className="bp-pill-row">
            {BLOG_CATS.map((c) => (
              <button key={c.key} onClick={() => setCat(c.key)} className={`bp-pill ${cat === c.key ? 'bp-pill-on' : ''}`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* featured + grid + sidebar */}
      <section className="bp-sec" style={{ paddingTop: 0 }}>
        <div className="bp-wrap bp-faq-grid">
          <div style={{ display: 'grid', gap: '1.6rem' }}>
            {/* featured */}
            {query.trim() === '' && cat === 'all' && (
              <Link href={`/blog/${FEATURED.slug}`} className="block" style={{ textDecoration: 'none' }}>
                <div className="bp-frame" style={{ background: 'linear-gradient(135deg, #0A5E2C, #0E7C3A)', borderColor: 'var(--bp-ink)' }}>
                  <div className="bp-media" style={{ border: 'none', padding: '1.6rem', display: 'grid', gap: '.6rem', color: 'var(--bp-card)' }}>
                    {FEATURED.badge && (
                      <span className="bp-tag" style={{ background: 'rgba(255,255,255,.2)', color: '#fff', border: 'none' }}>{FEATURED.badge}</span>
                    )}
                    <h2 style={{ color: 'var(--bp-card)', fontSize: 'clamp(1.3rem,1rem+1.4vw,1.7rem)', margin: 0 }}>{FEATURED.title}</h2>
                    <p style={{ fontSize: '.92rem', opacity: .9, margin: 0 }}>{FEATURED.excerpt}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.8rem', fontSize: '.8rem', opacity: .85 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem' }}><Calendar size={13} strokeWidth={1.7} aria-hidden="true" /> {FEATURED.date}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem' }}><Clock size={13} strokeWidth={1.7} aria-hidden="true" /> {FEATURED.readTime}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem' }}><Eye size={13} strokeWidth={1.7} aria-hidden="true" /> {formatViews(FEATURED.views)} views</span>
                      <span>{FEATURED.author}</span>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* grid */}
            {filtered.length === 0 ? (
              <div className="bp-faq-empty">কোনো আর্টিকেল পাওয়া যায়নি।</div>
            ) : (
              <div style={{ display: 'grid', gap: '1.2rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                {filtered.map((p) => (
                  <Link key={p.slug} href={`/blog/${p.slug}`} style={{ textDecoration: 'none' }}>
                    <article className="bp-tile" style={{ height: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.5rem', marginBottom: '.5rem' }}>
                        <span className="bp-tag">{p.category}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', fontSize: '.75rem', color: 'var(--bp-ink-soft)' }}>
                          <Eye size={12} strokeWidth={1.7} aria-hidden="true" /> {formatViews(p.views)}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '1.05rem', lineHeight: 1.35, margin: 0 }}>{p.title}</h3>
                      <p style={{ fontSize: '.88rem', color: 'var(--bp-ink-soft)', marginTop: '.4rem' }}>{p.excerpt}</p>
                      <div style={{ marginTop: '.8rem', display: 'flex', flexWrap: 'wrap', gap: '.4rem .8rem', fontSize: '.78rem', color: 'var(--bp-ink-soft)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem' }}><Calendar size={12} strokeWidth={1.7} aria-hidden="true" /> {p.date}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem' }}><Clock size={12} strokeWidth={1.7} aria-hidden="true" /> {p.readTime}</span>
                      </div>
                      <div style={{ marginTop: '.7rem', display: 'flex', flexWrap: 'wrap', gap: '.3rem' }}>
                        {p.tags.map((tg) => (
                          <span key={tg} className="bp-tag" style={{ fontSize: '.68rem' }}>{tg}</span>
                        ))}
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* SIDEBAR */}
          <aside style={{ display: 'grid', gap: '1rem', position: 'sticky', top: 96, alignSelf: 'start' }}>
            <div className="bp-tile">
              <p style={{ fontWeight: 700, fontSize: '.98rem', margin: 0 }}>বাংলায় AI টিপস পান</p>
              <p className="bp-muted" style={{ fontSize: '.84rem', marginTop: '.2rem' }}>সাপ্তাহিক ১ ইমেইল, কোনো স্প্যাম নয়।</p>
              {subbed ? (
                <p style={{ marginTop: '.9rem', fontSize: '.9rem', fontWeight: 600, color: 'var(--bp-green)', background: 'var(--bp-green-tint, #ECFDF5)', border: '2px solid var(--bp-green)', borderRadius: 10, padding: '.55rem .8rem' }}>সাবস্ক্রাইব করা হয়েছে!</p>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); if (email.includes('@')) setSubbed(true) }} style={{ display: 'grid', gap: '.5rem', marginTop: '.9rem' }}>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="আপনার ইমেইল"
                    aria-label="ইমেইল"
                    className="bp-form-input"
                  />
                  <button type="submit" className="bp-btn bp-btn-primary" style={{ padding: '.6rem 1rem', fontSize: '.9rem' }}>
                    <Mail size={15} strokeWidth={1.7} aria-hidden="true" /> সাবস্ক্রাইব
                  </button>
                </form>
              )}
            </div>

            <div className="bp-tile">
              <p style={{ fontWeight: 700, fontSize: '.98rem', margin: 0 }}>জনপ্রিয়</p>
              <ul style={{ display: 'grid', gap: '.55rem', marginTop: '.6rem' }}>
                {POPULAR.map((p) => (
                  <li key={p.slug}>
                    <Link href={`/blog/${p.slug}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '.5rem', textDecoration: 'none' }}>
                      <span className="bp-play" style={{ position: 'static', width: 22, height: 22, boxShadow: 'none', flex: 'none' }}>
                        <svg viewBox="0 0 24 24" style={{ width: 10, height: 10 }} aria-hidden="true"><path d="M7 5l12 7-12 7V5z" /></svg>
                      </span>
                      <span style={{ fontSize: '.86rem', fontWeight: 500, color: 'var(--bp-ink-soft)' }}>{p.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bp-tile">
              <p style={{ fontWeight: 700, fontSize: '.98rem', margin: 0 }}>ক্যাটাগরি</p>
              <ul style={{ display: 'grid', gap: '.45rem', marginTop: '.6rem', fontSize: '.9rem' }}>
                {BLOG_CATS.filter((c) => c.key !== 'all').map((c) => {
                  const n = POSTS.filter((p) => p.category === c.key).length
                  return (
                    <li key={c.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button onClick={() => setCat(c.key as BlogCat)} style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', color: 'var(--bp-ink-soft)', padding: 0 }}>
                        {c.label}
                      </button>
                      <span className="bp-tag" style={{ margin: 0 }}>{n}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </aside>
        </div>
      </section>

      {/* bottom CTA */}
      <div className="bp-cta-wrap">
        <div className="bp-scallop bp-scallop-flip" aria-hidden="true" />
        <div className="bp-cta-band">
          <h2>ব্লগ পড়লেন, এবার ভিডিও বানান</h2>
          <p>ফ্রি দিয়ে শুরু করুন, ক্রেডিট কার্ড লাগে না। ১০ মিনিটে প্রথম রিল তৈরি করুন।</p>
          <Link href="/video" className="bp-btn bp-btn-light">
            স্টুডিওতে যান <ArrowRight size={16} strokeWidth={1.7} aria-hidden="true" />
          </Link>
        </div>
        <div className="bp-scallop" aria-hidden="true" />
      </div>

      <BazaarFooter />
    </div>
  );
}
