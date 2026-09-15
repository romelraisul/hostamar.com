'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Globe, Check, Zap, Server, Database, Lock, ArrowLeft, Clock, ShieldCheck, ArrowRight } from 'lucide-react'
import BazaarNav from '@/components/home/BazaarNav'
import BazaarFooter from '@/components/home/BazaarFooter'

const COMPARE = [
  { f: 'bKash Auto Payment', ex: 'Manual', h: 'Auto' },
  { f: 'Bangla Panel', ex: 'No', h: 'Yes' },
  { f: 'Node.js Support', ex: 'Limited', h: 'Full' },
  { f: 'NVMe SSD', ex: 'No', h: 'Yes' },
  { f: 'Dhaka CDN 20ms', ex: 'No', h: 'Yes 20ms' },
  { f: 'Free SSL', ex: 'Paid', h: 'Free' },
  { f: 'Daily Backup', ex: 'Paid', h: 'Free' },
  { f: 'Support', ex: '24h', h: '12 min' },
  { f: 'Price', ex: '৳800', h: '৳0 ফ্রি টায়ার' },
]

const BENTO = [
  { icon: Globe, t: 'One-click WordPress', d: 'Vercel like experience' },
  { icon: Server, t: 'Node.js + Python', d: 'Full runtime support' },
  { icon: Zap, t: 'Dhaka CDN 20ms', d: 'BDIX low ping' },
  { icon: Lock, t: 'Free SSL + Daily Backup', d: 'Daily backup' },
  { icon: Database, t: 'বাংলা কন্ট্রোল প্যানেল', d: 'No English struggle' },
  { icon: ShieldCheck, t: 'Git push deploy', d: 'Ship from terminal' },
]

const MIGRATE = [
  { n: '১', t: 'ডোমেইন দিন', d: 'পুরানো প্যানেলের লগিন শেয়ার করুন (নিরাপদ)' },
  { n: '২', t: 'আমরা কপি করি', d: 'ফাইল + DB + ডোমেইন, জিরো ডাউনটাইম' },
  { n: '৩', t: 'Live', d: '৩০ মিনিটে ExonHost/HosTseba থেকে ফ্রি মাইগ্রেশন' },
]

const FAQ = [
  { q: 'cPanel আছে?', a: 'না — আমাদের নিজস্ব বাংলা কন্ট্রোল প্যানেল, cPanel-এর ঝামেলা ছাড়া।' },
  { q: 'WordPress চলবে?', a: 'হ্যাঁ, ১-ক্লিকে WordPress ইনস্টল, সব আপডেট অটো।' },
  { q: 'bKash auto কিভাবে?', a: 'চেকআউটে bKash সিলেক্ট করুন — মোবাইলে পেমেন্ট, অটো রিনিউ।' },
  { q: 'মাইগ্রেশন ফ্রি?', a: 'হ্যাঁ, ExonHost/HosTseba থেকে ফ্রি ফুল মাইগ্রেশন (৩০ মিনিট)।' },
]

const hostingLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Hostamar Web Hosting BDIX',
  areaServed: 'BD',
  provider: { '@type': 'Organization', name: 'Hostamar', url: 'https://hostamar.com' },
  offers: [
    { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'BDT', url: 'https://hostamar.com/hosting' },
    { '@type': 'Offer', name: 'Starter', price: '2000', priceCurrency: 'BDT', url: 'https://hostamar.com/pricing' },
    { '@type': 'Offer', name: 'Business', price: '3500', priceCurrency: 'BDT', url: 'https://hostamar.com/hosting' },
  ],
  aggregateOffer: { '@type': 'AggregateOffer', lowPrice: '0', highPrice: '3500', priceCurrency: 'BDT', offerCount: 3 },
}


const CHECK = (
  <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 15, height: 15, color: 'var(--bp-green)', marginTop: 2, flex: 'none' }}><path d="M5 12l4 4L19 7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export default function HostingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [yearly, setYearly] = useState(false)
  const starter = yearly ? 1600 : 2000
  const business = yearly ? 2800 : 3500

  return (
    <div className="bp-theme min-h-screen bg-[#FBF4E4] text-[#1C1917]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(hostingLd) }} />

      <BazaarNav />

      <div className="bp-wrap" style={{ paddingBlock: '.9rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', fontSize: '.88rem', color: 'var(--bp-ink-soft)', textDecoration: 'none' }}>
          <ArrowLeft size={15} strokeWidth={1.7} aria-hidden="true" /> হোমে ফিরুন
        </Link>
        <span className="bp-tag">BDIX DHAKA, 20MS</span>
      </div>

      <div className="bp-page-hero" style={{ paddingBlock: '1.4rem' }}>
        <div className="bp-wrap bp-stamp-row">
          <span className="bp-stamp">৫GB ফ্রি NVMe</span>
          <span className="bp-stamp">BDIX ঢাকা PoP</span>
          <span className="bp-stamp">৯৯.৯% SLA</span>
          <span className="bp-stamp">bKash, Nagad, Rocket</span>
        </div>
      </div>

      <section className="bp-sec">
        <div className="bp-wrap bp-about-grid">
          <div>
            <span className="bp-eyebrow">cPanel ছাড়া আধুনিক, BDIX</span>
            <h1 className="bp-h2" style={{ fontSize: 'clamp(1.9rem,1rem+2.2vw,2.7rem)', margin: '.4rem 0 .8rem' }}>
              cPanel ছাড়া আধুনিক হোস্টিং, <span style={{ color: 'var(--bp-green)' }}>bKash দিয়ে পেমেন্ট</span>
            </h1>
            <p className="bp-muted" style={{ fontSize: '1.02rem' }}>
              ঢাকা CDN 20ms, NVMe SSD, ৯৯.৯% আপটাইম, বাংলা কন্ট্রোল প্যানেল। ExonHost এর পুরানো cPanel এর বদলে Vercel এর মতো অভিজ্ঞতা, ৫GB ফ্রি থেকে শুরু।
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.8rem', marginTop: '1.4rem' }}>
              <Link href="/pricing" data-ga="pricing_click" className="bp-btn bp-btn-primary">ফ্রিতে শুরু করুন ৳0</Link>
              <a href="#compare" className="bp-btn bp-btn-ghost">তুলনা দেখুন</a>
            </div>
            <div className="bp-stamp-row" style={{ marginTop: '1.3rem' }}>
              <span className="bp-stamp">BDIX Dhaka</span>
              <span className="bp-stamp">LiteSpeed + LSCache</span>
              <span className="bp-stamp">JetBackup</span>
            </div>
          </div>
          <div className="bp-frame bp-frame-tilt-r" style={{ background: 'var(--bp-ink)', borderColor: 'var(--bp-ink)' }}>
            <div className="bp-media" style={{ border: 'none', padding: '1.4rem', color: '#F6EBD2' }}>
              <div style={{ fontSize: '.75rem', opacity: .65, letterSpacing: '.05em' }}>hostamar.com, কন্ট্রোল প্যানেল</div>
              <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '.7rem', textAlign: 'center' }}>
                {[['5GB', 'Free NVMe'], ['99.9%', 'Uptime'], ['20ms', 'BD Ping']].map(([n, l]) => (
                  <div key={l} style={{ background: 'rgba(255,255,255,.08)', borderRadius: 12, padding: '.8rem .4rem' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{n}</div>
                    <div style={{ fontSize: '.7rem', opacity: .65 }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '.9rem', background: '#FFFDF6', color: '#1C1917', borderRadius: 12, padding: '.8rem', fontSize: '.86rem', fontWeight: 600, display: 'grid', gap: '.3rem' }}>
                <span>WordPress 1-click + Node.js</span>
                <span>Free SSL + Daily Backup</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bp-sec bp-sec-alt" id="compare" aria-label="তুলনা">
        <div className="bp-wrap">
          <div className="bp-sec-head">
            <h2>ExonHost vs Hostamar — ৳0 বান্ডেলে কী পান</h2>
            <p>HostSeba: No AI vs Hostamar: AI সহ, bKash/Nagad</p>
          </div>
          <div className="bp-tile" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="bp-vs-head" style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr', fontWeight: 700, background: 'var(--bp-paper-3)', borderBottom: '2px solid var(--bp-ink)' }}>
              <div style={{ padding: '.7rem 1rem', fontSize: '.92rem' }}>Feature</div>
              <div style={{ padding: '.7rem 1rem', fontSize: '.92rem', textAlign: 'center' }}>ExonHost</div>
              <div style={{ padding: '.7rem 1rem', fontSize: '.92rem', textAlign: 'center', color: 'var(--bp-green)' }}>Hostamar</div>
            </div>
            {COMPARE.map((r) => (
              <div key={r.f} style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr', borderTop: '1.5px dotted rgba(28,25,23,.3)' }}>
                <div style={{ padding: '.7rem 1rem', fontSize: '.92rem', fontWeight: 600 }}>{r.f}</div>
                <div style={{ padding: '.7rem 1rem', fontSize: '.9rem', color: 'var(--bp-ink-soft)', textAlign: 'center' }}>{r.ex}</div>
                <div style={{ padding: '.7rem 1rem', fontSize: '.92rem', fontWeight: 700, color: 'var(--bp-green)', textAlign: 'center', background: 'var(--bp-green-tint, #ECFDF5)' }}>{r.h}</div>
              </div>
            ))}
            <div style={{ padding: '.65rem 1rem', fontSize: '.78rem', color: 'var(--bp-ink-soft)', background: 'var(--bp-paper-2)' }}>
              ExonHost Starter ~৳834/mo (WHTop) — HostSeba Basic ৳831/yr প্রথম বছর, renew +30%। Hostamar: কোনো renew trap নেই।
            </div>
          </div>
        </div>
      </section>

      <section className="bp-sec" aria-label="হোস্টিং ফিচার">
        <div className="bp-wrap">
          <div className="bp-sec-head">
            <h2>আধুনিক হোস্টিং স্ট্যাক</h2>
          </div>
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {BENTO.map((b) => {
              const Icon = b.icon
              return (
                <div key={b.t} className="bp-tile">
                  <Icon size={19} strokeWidth={1.7} aria-hidden="true" style={{ color: 'var(--bp-green)' }} />
                  <h3 style={{ marginTop: '.5rem' }}>{b.t}</h3>
                  <p>{b.d}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bp-sec bp-sec-alt" id="migrate" aria-label="মাইগ্রেশন">
        <div className="bp-wrap">
          <div className="bp-sec-head">
            <h2>ExonHost থেকে ফ্রি মাইগ্রেশন ৩০ মিনিটে</h2>
            <p>জিরো ডাউনটাইম — ফাইল + DB + ডোমেইন আমরা কপি করি</p>
          </div>
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            {MIGRATE.map((m) => (
              <div key={m.n} className="bp-tile">
                <span className="bp-tag">{m.n}</span>
                <h3 style={{ marginTop: '.3rem' }}>{m.t}</h3>
                <p>{m.d}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '1.3rem', textAlign: 'center' }}>
            <Link href="/pricing" data-ga="pricing_click" className="bp-btn bp-btn-primary">মাইগ্রেশন শুরু করুন</Link>
          </div>
        </div>
      </section>

      <section className="bp-sec" aria-label="হোস্টিং প্ল্যান">
        <div className="bp-wrap">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.7rem', marginBottom: '1.6rem' }}>
            <button onClick={() => setYearly(false)} className={`bp-pill ${!yearly ? 'bp-pill-on' : ''}`}>মাসিক</button>
            <button onClick={() => setYearly(true)} className={`bp-pill ${yearly ? 'bp-pill-on' : ''}`}>
              বার্ষিক <span style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--bp-ink)', background: 'var(--bp-amber)', borderRadius: 999, padding: '.05rem .45rem', marginLeft: '.35rem' }}>২০% ছাড়</span>
            </button>
          </div>
          <div className="bp-plans">
            <div className="bp-tile bp-plan">
              <span className="bp-plan-name">Free</span>
              <div className="bp-price">৳0</div>
              <div style={{ fontSize: '.8rem', color: 'var(--bp-ink-soft)' }}>5GB NVMe, 1 site</div>
              <ul className="bp-check">
                <li>{CHECK}5GB NVMe</li>
                <li>{CHECK}Free SSL</li>
                <li>{CHECK}1 Website</li>
              </ul>
              <Link href="/signup" className="bp-btn bp-btn-ghost">ফ্রি শুরু</Link>
            </div>
            <div className="bp-tile bp-plan bp-plan-featured">
              <span className="bp-rosette">Popular</span>
              <span className="bp-plan-name">Starter</span>
              <div className="bp-price">৳{starter}<small>/mo</small></div>
              <div style={{ fontSize: '.8rem', color: 'var(--bp-ink-soft)' }}>10GB NVMe, 10 sites</div>
              <ul className="bp-check">
                <li>{CHECK}10GB NVMe</li>
                <li>{CHECK}10 Websites</li>
                <li>{CHECK}bKash Auto</li>
                <li>{CHECK}Daily Backup</li>
              </ul>
              <Link href="/pricing" data-ga="bkash_click" className="bp-btn bp-btn-primary">Starter নিন</Link>
            </div>
            <div className="bp-tile bp-plan">
              <span className="bp-plan-name">Business</span>
              <div className="bp-price">৳{business}<small>/mo</small></div>
              <div style={{ fontSize: '.8rem', color: 'var(--bp-ink-soft)' }}>50GB NVMe — Video Business কিনলে Hosting Free</div>
              <ul className="bp-check">
                <li>{CHECK}50GB NVMe</li>
                <li>{CHECK}Unlimited</li>
                <li>{CHECK}4K + API</li>
                <li>{CHECK}Team 5</li>
              </ul>
              <Link href="/pricing" className="bp-btn bp-btn-ghost">Business দেখুন</Link>
            </div>
          </div>
          <p className="bp-muted" style={{ textAlign: 'center', marginTop: '1rem', fontSize: '.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem' }}>
            <Clock size={14} strokeWidth={1.7} aria-hidden="true" /> একটি সাবস্ক্রিপশনে সব — Video + Hosting + Chat + IDE।
          </p>
        </div>
      </section>

      <section className="bp-sec bp-sec-alt" aria-label="হোস্টিং প্রশ্ন">
        <div className="bp-wrap" style={{ maxWidth: 820 }}>
          <div className="bp-sec-head">
            <h2>প্রশ্ন ও উত্তর</h2>
          </div>
          <div className="bp-faq">
            {FAQ.map((f, i) => (
              <details key={f.q} open={i === 0} onToggle={(e) => { const el = e.currentTarget; setOpenFaq(el.open ? i : null) }}>
                <summary>
                  {f.q}
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <div className="bp-sticky-cta">
        <div className="bp-wrap bp-sticky-in">
          <span style={{ fontWeight: 700, fontSize: '.92rem' }}>৳0 থেকে শুরু</span>
          <Link href="/pricing" data-ga="pricing_click" className="bp-btn bp-btn-primary" style={{ padding: '.55rem 1.2rem', fontSize: '.88rem' }}>ফ্রিতে শুরু</Link>
        </div>
      </div>

      <BazaarFooter />
    </div>
  );
}
