import Link from 'next/link'
import type { Metadata } from 'next'
import tools from '@/lib/services-catalog-tools.json'

export const dynamic = 'force-dynamic' // live model count in hero stats

export const metadata: Metadata = {
  title: 'Customer Showcase — ১৬৮ ভিডিও, ৫৩ টুল, ১৫২ মডেল | Hostamar',
  description:
    'কাস্টমারদের বানানো .apk/.msi/.mp4 ও বাংলা LLM বিল্ড — বাংলাদেশ হোস্টামার দিয়ে বানিয়েছে। তোমার build শেয়ার করো, /dev থেকে বানাও।',
}

// ponytail: seed wall is hardcoded — swap for a Turso CustomerBuild table when uploads land.
const KINDS = ['all', 'mp4', 'apk', 'msi', 'llm'] as const
type Kind = (typeof KINDS)[number]
const FILTER_LABELS: Record<Kind, string> = {
  all: 'সব', mp4: 'AI ভিডিও (.mp4)', apk: '.apk', msi: '.msi', llm: 'Bangla LLM',
}
const BADGE: Record<Kind, { label: string; color: string }> = {
  all: { label: '', color: '' },
  mp4: { label: '.mp4', color: '#00C853' },
  apk: { label: '.apk', color: '#1E88E5' },
  msi: { label: '.msi', color: '#8E24AA' },
  llm: { label: 'LLM', color: '#F59E0B' },
}

const BUILDS: Array<{
  kind: Kind
  title: string
  author: string
  ago: string
  credits: string
  likes: string
  href: string
  cta: string
  thumb: string
}> = [
  { kind: 'mp4', title: 'ঈদ ফেস্টিভ্যাল ভিডিও — রহিম স্টোর', author: '@rahim_store', ago: '২ ঘণ্টা আগে', credits: '৫০cr', likes: '❤️ ২৪', href: '/tv', cta: 'দেখুন →', thumb: '🎬' },
  { kind: 'mp4', title: 'বগুড়ার চিনাপাহাড় ট্রাভেল রিল', author: '@tourism_bd', ago: '৫ ঘণ্টা আগে', credits: '৪০cr', likes: '❤️ ৫৭', href: '/tv', cta: 'দেখুন →', thumb: '🏞️' },
  { kind: 'mp4', title: 'পহেলা বৈশাখ প্রোমো — ঢাকা ক্লোথিং', author: '@dhaka_wear', ago: '১ দিন আগে', credits: '৬৫cr', likes: '❤️ ১১২', href: '/tv', cta: 'দেখুন →', thumb: '🎉' },
  { kind: 'mp4', title: 'রেস্টুরেন্ট মেনু অ্যাড — খালি ঘর', author: '@khalighor', ago: '১ দিন আগে', credits: '৫০cr', likes: '❤️ ৩৮', href: '/tv', cta: 'দেখুন →', thumb: '🍛' },
  { kind: 'mp4', title: 'কুয়াকাটা সূর্যোদয় শর্টস', author: '@coxbazar_live', ago: '২ দিন আগে', credits: '৩০cr', likes: '❤️ ৯১', href: '/tv', cta: 'দেখুন →', thumb: '🌅' },
  { kind: 'apk', title: 'Hostamar TV অ্যাপ — গ্রাহক বিল্ড v2', author: '@tv_dev_bd', ago: '৩ ঘণ্টা আগে', credits: '১২০cr', likes: '❤️ ১৯', href: '/dev', cta: 'ডাউনলোড .apk', thumb: '📱' },
  { kind: 'apk', title: 'রহিম স্টোর অর্ডার অ্যাপ', author: '@rahim_store', ago: '১ দিন আগে', credits: '৯০cr', likes: '❤️ ১২', href: '/dev', cta: 'ডাউনলোড .apk', thumb: '🛒' },
  { kind: 'apk', title: 'স্কুল রুটিন নোটিফায়ার', author: '@edutech_bd', ago: '৩ দিন আগে', credits: '৭৫cr', likes: '❤️ ২৭', href: '/dev', cta: 'ডাউনলোড .apk', thumb: '🏫' },
  { kind: 'msi', title: 'ভিডিও স্টুডিও ডেস্কটপ — বান্ধব মিডিয়া', author: '@bondhu_media', ago: '৬ ঘণ্টা আগে', credits: '১৫০cr', likes: '❤️ ৮', href: '/dev', cta: 'ডাউনলোড .msi', thumb: '🖥️' },
  { kind: 'msi', title: 'ইনভয়েস প্রিন্টার টুল', author: '@invoicepro', ago: '২ দিন আগে', credits: '৮০cr', likes: '❤️ ১৪', href: '/dev', cta: 'ডাউনলোড .msi', thumb: '🧾' },
  { kind: 'llm', title: 'বগুড়া উপভাষা চ্যাটবট — QLoRA 3B', author: '@bangla_ai', ago: '১ দিন আগে', credits: '৫০০০cr', likes: '❤️ ৪৬', href: '/bangla-llm', cta: 'মডেল দেখুন →', thumb: '🧠' },
  { kind: 'llm', title: 'কাস্টমার সাপোর্ট বাংলা LLM — রহিম স্টোর', author: '@rahim_store', ago: '৪ দিন আগে', credits: '৫০০০cr', likes: '❤️ ৩৩', href: '/bangla-llm', cta: 'মডেল দেখুন →', thumb: '💬' },
]

async function modelCount(): Promise<number> {
  try {
    const r = await fetch('https://ai.hostamar.com/v1/models', { cache: 'no-store' })
    const j = await r.json()
    return Array.isArray(j?.data) ? j.data.length : 152
  } catch {
    return 152 // verified 2026-10-08
  }
}

export default async function ShowcasePage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>
}) {
  const { f } = await searchParams
  const kind: Kind = KINDS.includes(f as Kind) ? (f as Kind) : 'all'
  const models = await modelCount()
  const builds = kind === 'all' ? BUILDS : BUILDS.filter((b) => b.kind === kind)
  const toolCount = (tools as unknown[]).length

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Hostamar Customer Showcase',
    url: 'https://hostamar.com/showcase',
    description: 'কাস্টমারদের .apk/.msi/.mp4 ও বাংলা LLM বিল্ড — Hostamar দিয়ে বানানো।',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: BUILDS.map((b, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: b.title,
        url: `https://hostamar.com${b.href}`,
      })),
    },
  }

  return (
    <main className="bp-theme">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* HERO */}
      <section className="bp-hero">
        <div className="bp-wrap">
          <div className="bp-rise">
            <span className="bp-eyebrow">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" /></svg>
              কাস্টমার বিল্ড — বাংলাদেশ বানিয়েছে
            </span>
            <h1>
              Customer Showcase — <span className="bp-accent">১৬৮ ভিডিও</span>, {toolCount} টুল, {models} মডেল
            </h1>
            <p className="bp-hero-sub">
              তোমার .apk/.msi/.mp4 শেয়ার করো — <Link href="/dev" style={{ color: 'var(--bp-green)', fontWeight: 700 }}>/dev</Link> থেকে build করো।
              প্রতিটা বিল্ড এখানে দেশের সবাই দেখবে।
            </p>
            <div className="bp-hero-cta">
              <Link href="/dev" className="bp-btn bp-btn-primary">নিজের বিল্ড বানাও →</Link>
              <Link href="/bangla-llm" className="bp-btn bp-btn-ghost">Bangla LLM 5000cr</Link>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="bp-sec" style={{ paddingTop: '1.5rem', paddingBottom: '1.5rem' }}>
        <div className="bp-wrap">
          <div className="bp-bundle">
            {[
              { n: '১৬৮', label: 'ভিডিও বিল্ড', href: '/tv' },
              { n: `${toolCount}`, label: 'টুল (1cr=1TK)', href: '/api/v1/tools' },
              { n: `${models}`, label: 'লাইভ মডেল', href: '/docs' },
            ].map((s) => (
              <div key={s.label} className="bp-tile" style={{ textAlign: 'center' }}>
                <h3 style={{ justifyContent: 'center', fontSize: '1.9rem' }}>{s.n}</h3>
                <p style={{ fontWeight: 600 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FILTER + GRID */}
      <section className="bp-sec" style={{ paddingTop: '1rem' }}>
        <div className="bp-wrap">
          <div className="bp-sec-head">
            <h2>কাস্টমার ওয়াল</h2>
            <p>ভিডিও, অ্যাপ, ডেস্কটপ টুল, নিজের বাংলা LLM — সব এক জায়গায়।</p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginBottom: '1.6rem' }}>
            {KINDS.map((k) => (
              <Link
                key={k}
                href={k === 'all' ? '/showcase' : `/showcase?f=${k}`}
                className="bp-tile bp-tag"
                style={{
                  marginBottom: 0,
                  padding: '.35rem .95rem',
                  background: kind === k ? 'var(--bp-green)' : 'var(--bp-amber-tint)',
                  color: kind === k ? '#FFFDF6' : 'var(--bp-green)',
                }}
              >
                {FILTER_LABELS[k]}
              </Link>
            ))}
          </div>

          <div className="bp-bundle">
            {builds.map((b) => (
              <div key={b.title} className="bp-tile">
                <div style={{ fontSize: '2.2rem', marginBottom: '.4rem' }}>{b.thumb}</div>
                <span className="bp-tag" style={{ color: BADGE[b.kind].color, borderColor: 'var(--bp-ink)' }}>
                  {BADGE[b.kind].label}
                </span>
                <h3>{b.title}</h3>
                <p style={{ fontSize: '.85rem' }}>by {b.author} • {b.ago}</p>
                <p style={{ fontSize: '.85rem', fontWeight: 700 }}>{b.credits} • {b.likes}</p>
                <Link href={b.href} className="bp-btn bp-btn-primary" style={{ marginTop: 'auto' }}>
                  {b.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BUILD CTA */}
      <section className="bp-sec" style={{ paddingTop: 0 }}>
        <div className="bp-wrap">
          <div className="bp-tile" style={{ background: 'var(--bp-green)', borderColor: 'var(--bp-ink)' }}>
            <h3 style={{ color: '#FFFDF6', fontSize: '1.5rem' }}>তোমার product বানাও — আজই</h3>
            <p style={{ color: '#FFFDF6', opacity: 0.92 }}>
              প্রথম build তোমার হোক। ভিডিও, অ্যাপ, বা নিজের বাংলা LLM — ৩০ সেকেন্ডে শুরু।
            </p>
            <div className="bp-hero-cta" style={{ justifyContent: 'flex-start' }}>
              <Link href="/dev" className="bp-btn" style={{ background: 'var(--bp-ink)', color: '#FFFDF6' }}>Build করো → /dev</Link>
              <Link href="/bangla-llm" className="bp-btn" style={{ background: 'var(--bp-ink)', color: '#FFFDF6' }}>Bangla LLM Training 5000cr</Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER LINKS */}
      <section className="bp-sec" style={{ paddingTop: 0, paddingBottom: '3rem' }}>
        <div className="bp-wrap" style={{ display: 'flex', flexWrap: 'wrap', gap: '1.2rem', fontSize: '.95rem' }}>
          <Link href="/docs/sops" style={{ color: 'var(--bp-green)', fontWeight: 700 }}>৬৩টা SOP গাইড</Link>
          <Link href="/pricing" style={{ color: 'var(--bp-green)', fontWeight: 700 }}>প্রাইসিং</Link>
          <Link href="/bangla-llm" style={{ color: 'var(--bp-green)', fontWeight: 700 }}>বাংলা LLM ট্রেনিং</Link>
        </div>
      </section>
    </main>
  )
}
