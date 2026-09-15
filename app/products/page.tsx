import { Metadata } from 'next'
import Link from 'next/link'
import { PRODUCTS } from '@/lib/products'
import BazaarNav from '@/components/home/BazaarNav'
import BazaarFooter from '@/components/home/BazaarFooter'

export const metadata: Metadata = {
  title: 'Products - Hostamar',
  description:
    'ছয়টি পণ্য, একটি প্ল্যাটফর্ম — AI ভিডিও, ক্লাউড হোস্টিং, AI চ্যাট, AI ব্রাউজার, গেম, Dev IDE।',
}

const STATUS_BADGE: Record<string, { label: string; bg: string }> = {
  live:   { label: 'Live — ব্যবহার করুন',  bg: '#2563EB' },
  beta:   { label: 'Beta — চলছে',          bg: '#F59E0B' },
  planned:{ label: 'শীঘ্রই আসছে',           bg: '#57534E' },
}

export default function ProductsPage() {
  const live = PRODUCTS.filter(p => p.status === 'live')
  const beta = PRODUCTS.filter(p => p.status === 'beta')
  const planned = PRODUCTS.filter(p => p.status === 'planned')

  return (
    <div className="bp-theme min-h-screen bg-[#FBF4E4] text-[#1C1917]">
      <BazaarNav />

      <div className="bp-page-hero">
        <div className="bp-wrap">
          <h1>পণ্যসমূহ</h1>
          <p>ছয়টি পণ্য, একটি প্ল্যাটফর্ম — AI ভিডিও, ক্লাউড হোস্টিং, AI চ্যাট, AI ব্রাউজার, গেম, Dev IDE</p>
        </div>
      </div>

      <section className="bp-sec" aria-label="সব পণ্য">
        <div className="bp-wrap">
          <div className="bp-sec-head">
            <h2>সব পণ্য</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', flexWrap: 'wrap' }}>
              <span className="bp-tag">70% LIVE</span>
              <span className="bp-muted" style={{ fontSize: '.9rem' }}>AI Video + Hosting, টাকা বানায়</span>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '1.4rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {[...PRODUCTS].sort((a, b) => {
              const order: Record<string, number> = { 'ai-video': 1, 'cloud-hosting': 2, 'ai-chat': 3, 'dev-ide': 4, 'ai-browser': 5, 'game': 6 }
              return (order[a.slug] ?? 99) - (order[b.slug] ?? 99)
            }).map((p) => {
              const badge = STATUS_BADGE[p.status]
              return (
                <Link
                  key={p.slug}
                  href={`/products/${p.slug}`}
                  style={{ textDecoration: 'none', opacity: p.status === 'planned' ? 0.7 : 1 }}
                >
                  <article className="bp-tile" style={{ padding: 0, overflow: 'hidden', height: '100%' }}>
                    <div style={{ background: `linear-gradient(135deg, ${p.gradient})`, padding: '1.3rem', color: '#fff', position: 'relative' }}>
                      <span className="bp-tag" style={{ background: 'rgba(255,255,255,.2)', color: '#fff', borderColor: 'rgba(255,255,255,.4)' }}>{p.badge}</span>
                      <h3 style={{ margin: '.6rem 0 0', fontSize: '1.35rem' }}>{p.nameBn}</h3>
                      <p style={{ fontSize: '.85rem', opacity: .9, margin: 0 }}>{p.nameEn}</p>
                    </div>
                    <div style={{ padding: '1.2rem' }}>
                      <p style={{ fontWeight: 600, fontSize: '.92rem', margin: '0 0 .4rem' }}>{p.taglineBn}</p>
                      <p style={{ fontSize: '.86rem', color: 'var(--bp-ink-soft)', margin: '0 0 1rem' }}>{p.description}</p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className="bp-tag" style={{ background: 'var(--bp-paper-2)', color: 'var(--bp-ink-soft)' }}>{badge.label}</span>
                        <span style={{ fontSize: '.9rem', fontWeight: 600, color: 'var(--bp-green)' }}>বিস্তারিত</span>
                      </div>
                    </div>
                  </article>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bp-sec bp-sec-alt" aria-label="প্রতিযোগিতামূলক সুবিধা">
        <div className="bp-wrap">
          <div className="bp-sec-head">
            <span className="bp-eyebrow">প্রতিযোগিতামূলক সুবিধা</span>
            <h2>কেন হোস্টামার, গ্লোবাল টুলগুলোর চেয়ে আলাদা</h2>
            <p>আমাদের প্রতিটি পণ্য বাংলাদেশের জন্য নির্মিত</p>
          </div>
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {PRODUCTS.map((p) => (
              <div key={p.slug} className="bp-tile">
                <div style={{ display: 'flex', alignItems: 'center', gap: '.55rem' }}>
                  <span className="bp-play" style={{ position: 'static', width: 24, height: 24, boxShadow: 'none', flex: 'none' }}>
                    <svg viewBox="0 0 24 24" style={{ width: 10, height: 10 }} aria-hidden="true"><path d="M7 5l12 7-12 7V5z" /></svg>
                  </span>
                  <span style={{ fontFamily: 'var(--font-bn)', fontWeight: 700, color: 'var(--bp-ink)' }}>{p.nameBn}</span>
                </div>
                <p style={{ marginTop: '.45rem' }}>{p.competitorGap}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="bp-cta-wrap">
        <div className="bp-scallop bp-scallop-flip" aria-hidden="true" />
        <div className="bp-cta-band">
          <h2>একটি সাবস্ক্রিপশনে সব ছয়টি</h2>
          <p>আলাদা টুল কেনা বন্ধ। হোস্টামার প্ল্যানে সবকিছু পাবেন, AI ভিডিও, ক্লাউড, চ্যাট, ব্রাউজার, গেম, IDE।</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '.5rem', marginBottom: '.4rem', fontSize: '.9rem' }}>
            {['মাসে ১০টা ভিডিও', '১০০ চ্যাট মেসেজ/দিন', '৫GB হোস্টিং ফ্রি', 'IDE আনলিমিটেড'].map((c) => (
              <span key={c} className="bp-stamp" style={{ padding: '.3rem .8rem', fontSize: '.84rem' }}>{c}</span>
            ))}
          </div>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: '.8rem 0 0' }}>শুরু মাত্র ৳৫৯৯/মাস</p>
          <Link href="/signup?ref=products-bottom" className="bp-btn bp-btn-light" style={{ marginTop: '.9rem' }}>
            সব পণ্য একসাথে শুরু করুন
          </Link>
        </div>
        <div className="bp-scallop" aria-hidden="true" />
      </div>

      <BazaarFooter />
    </div>
  );
}
