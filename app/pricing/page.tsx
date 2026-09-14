'use client'

// Bazaar Poster pricing (Direction C, 2026-09). ALL billing logic preserved
// verbatim: /api/billing/create-checkout, /api/billing/verify-trx (V17 rule:
// credits granted on approval, never claimed client-side), Binance rate,
// Stripe/PayPal/Nagad/Rocket paths, sticky CTA. Only presentation restyled.

import { useState } from 'react'
import Link from 'next/link'
import { Check, ShieldCheck, Sparkles, Loader2 } from 'lucide-react'
import { PLANS, type Plan } from '@/lib/pricing'
import { useBinanceRate, BinanceBadge, WelcomeBanner, HostaTeaser } from '@/components/pricing-binance'

// Brand
const BKASH = '#E2136E'
const STRIPE = '#635BFF'

// Helpers: English -> Bangla digits
const BN_DIGITS: Record<string, string> = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯', '.': '.', ',': ',' }
function toBn(s: string | number): string {
  return String(s).split('').map(c => BN_DIGITS[c] ?? c).join('')
}
function toBnInt(n: number): string {
  return toBn(n.toLocaleString('en-US'))
}
function usdFromTaka(taka: number, rate: number): string {
  return (taka / rate).toFixed(2)
}

// SEO
const pricingJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Hostamar AI Marketing + Hosting',
  description: 'বাংলাদেশি ব্যবসার জন্য AI মার্কেটিং ভিডিও + BDIX হোস্টিং — ৫০+ বাংলা টেমপ্লেট, bKash/Nagad/Rocket।',
  brand: { '@type': 'Brand', name: 'Hostamar' },
  offers: [
    { '@type': 'Offer', name: 'Starter', price: '599', priceCurrency: 'BDT', url: 'https://hostamar.com/pricing', priceValidUntil: '2026-12-31' },
    { '@type': 'Offer', name: 'Pro', price: '1299', priceCurrency: 'BDT', url: 'https://hostamar.com/pricing', priceValidUntil: '2026-12-31' },
    { '@type': 'Offer', name: 'Business', price: '2999', priceCurrency: 'BDT', url: 'https://hostamar.com/pricing', priceValidUntil: '2026-12-31' },
  ],
}

type TrxState = 'idle' | 'verifying' | 'success' | 'error'

function TrxVerify({ plan, credits }: { plan: Plan; credits: number }) {
  const [trx, setTrx] = useState('')
  const [state, setState] = useState<TrxState>('idle')
  const [msg, setMsg] = useState('')

  async function verify() {
    if (!trx.trim()) { setMsg('ট্রানজেকশন আইডি দিন'); setState('error'); return }
    setState('verifying')
    setMsg('TrxID যাচাই হচ্ছে…')
    try {
      // V17: REAL verification only — /api/billing/verify-trx records the
      // TrxID for admin/SMS approval. Credits are granted on approval, NEVER
      // claimed client-side. No demo/fake-success branch anymore.
      const res = await fetch('/api/billing/verify-trx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trxId: trx.trim(), plan: plan.id }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok && (data?.ok || data?.success)) {
        setState('success')
        setMsg(data?.message || `TrxID গৃহীত — অনুমোদনের পর ${toBn(credits)} ক্রেডিট যোগ হবে`)
      } else {
        setState('error')
        setMsg(data?.error || 'TrxID যাচাই ব্যর্থ — আবার চেষ্টা করুন')
      }
    } catch {
      setState('error')
      setMsg('যাচাই ব্যর্থ — আবার চেষ্টা করুন')
    }
  }

  return (
    <div className="bp-trx">
      <p className="bp-trx-label">bKash ট্রানজেকশন যাচাই</p>
      <div className="bp-trx-row">
        <input
          value={trx}
          onChange={e => { setTrx(e.target.value); if (state !== 'idle') setState('idle') }}
          placeholder="ট্রানজেকশন আইডি লিখুন"
          className="bp-trx-input"
        />
        <button
          onClick={verify}
          disabled={state === 'verifying'}
          className="bp-trx-btn"
          style={{ background: BKASH }}
        >
          {state === 'verifying' ? (
            <span className="bp-trx-loading"><Loader2 className="bp-trx-spin" size={14} aria-hidden="true" /> যাচাই হচ্ছে...</span>
          ) : 'যাচাই করুন'}
        </button>
      </div>
      {state === 'success' && <p className="bp-trx-ok">{msg}</p>}
      {state === 'error' && <p className="bp-trx-err">{msg}</p>}
    </div>
  )
}

export default function PricingPage() {
  const binance = useBinanceRate()
  const rate = binance?.usdtBdt ?? 126.25

  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null)

  async function startStripe(plan: Plan['id']) {
    setCheckoutPlan(plan)
    try {
      const res = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json().catch(() => null)
      if (data?.url || data?.stripeUrl) {
        window.location.href = data.url || data.stripeUrl
        return
      }
      if (data?.bkashURL) {
        window.location.href = data.bkashURL
        return
      }
      window.location.href = `/signup?plan=${plan}`
    } catch {
      window.location.href = `/signup?plan=${plan}`
    } finally {
      setCheckoutPlan(null)
    }
  }

  return (
    <div className="bp-theme">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd) }} />

      {/* trust stamps */}
      <div className="bp-page-hero" style={{ paddingBlock: '1.2rem' }}>
        <div className="bp-wrap bp-stamp-row" style={{ justifyContent: 'center' }}>
          <span className="bp-stamp">
            <svg className="bp-stamp-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 4v5c0 4.5-3 8-7 9-4-1-7-4.5-7-9V7l7-4z" /><path d="M9.5 12l2 2 3.5-4" /></svg>
            ৭ দিন মানি-ব্যাক গ্যারান্টি
          </span>
          <span className="bp-stamp">bKash, Nagad, Rocket</span>
          <span className="bp-stamp">ক্রেডিট কার্ড লাগবে না</span>
        </div>
      </div>

      {/* Binance live rate + welcome banner */}
      <div className="bp-wrap" style={{ paddingTop: '1.4rem' }}>
        <WelcomeBanner />
        <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '.8rem' }}>
          <BinanceBadge rate={binance} />
          <span className="bp-muted" style={{ fontSize: '.8rem' }}>১ USDT ≈ {toBn(rate.toFixed(2))} BDT (Binance P2P)</span>
        </div>
      </div>

      {/* Hero */}
      <section className="bp-page-hero" style={{ border: 'none', background: 'transparent', paddingBlock: '2rem 1.5rem', textAlign: 'center' }}>
        <div className="bp-wrap" style={{ maxWidth: 680, marginInline: 'auto' }}>
          <span className="bp-eyebrow">
            <Sparkles size={15} strokeWidth={1.7} aria-hidden="true" style={{ color: 'var(--bp-green)' }} /> সিম্পল প্রাইসিং
          </span>
          <h1 style={{ marginTop: '.6rem' }}>
            AI + হোস্টিং, <span style={{ color: 'var(--bp-green)' }}>এক দামে</span>
          </h1>
          <p>ভিডিও, হোস্টিং, চ্যাট, ব্রাউজার, IDE, সব এক সাবস্ক্রিপশনে। bKash দিয়ে ৩০ সেকেন্ডে শুরু</p>
        </div>
      </section>

      {/* 3 cards */}
      <section className="bp-wrap" style={{ paddingBottom: '1rem' }}>
        <div className="bp-plans">
          {PLANS.map((p) => {
            const isPopular = p.id === 'starter'
            const usd = usdFromTaka(p.priceMonthly, rate)
            return (
              <div
                key={p.id}
                className={`bp-tile bp-plan ${isPopular ? 'bp-plan-featured' : ''}`}
              >
                {p.badge && <span className="bp-rosette" style={isPopular ? undefined : { background: 'var(--bp-card)' }}>{p.badge}</span>}
                <span className="bp-plan-name">{p.nameBn} <span className="bp-muted" style={{ textTransform: 'none', fontWeight: 500 }}>({p.name})</span></span>
                <p style={{ fontSize: '.82rem', margin: '.15rem 0 0' }}>{p.tagline}</p>
                <div className="bp-price">৳{toBnInt(p.priceMonthly)} <small>/মাস</small></div>
                <div style={{ fontSize: '.8rem', color: 'var(--bp-ink-soft)' }}>
                  <b>{toBn(p.priceMonthly)} টাকা</b> ≈ <b>${toBn(usd)}</b> @{toBn(rate.toFixed(2))}
                </div>
                <div style={{ marginTop: '.5rem' }}>
                  <span className="bp-tag">{toBn(p.credits)} ক্রেডিট / মাস</span>
                </div>

                <ul className="bp-check" style={{ margin: '1.1rem 0 1.3rem' }}>
                  {p.features.map((f) => (
                    <li key={f}>
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l4 4L19 7" /></svg>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <div style={{ display: 'grid', gap: '.55rem', marginTop: 'auto' }}>
                  {/* bKash primary */}
                  <a
                    href={`/signup?plan=${p.id}`}
                    className="bp-btn"
                    style={{ background: BKASH, color: '#fff' }}
                  >
                    bKash দিয়ে নিন, ৳{toBnInt(p.priceMonthly)}
                  </a>
                  <TrxVerify plan={p} credits={p.credits} />

                  {/* Card checkout (Stripe/PayPal) — one shared handler */}
                  <button
                    onClick={() => startStripe(p.id)}
                    disabled={checkoutPlan !== null}
                    className="bp-btn"
                    style={{ background: STRIPE, color: '#fff' }}
                  >
                    {checkoutPlan === p.id ? 'প্রসেস হচ্ছে…' : 'Pay with Stripe'}
                  </button>

                  {/* PayPal */}
                  <button
                    onClick={() => startStripe(p.id)}
                    className="bp-btn"
                    style={{ background: '#FFC439', color: '#0F172A', borderColor: '#E2B500' }}
                  >
                    Pay with PayPal
                  </button>

                  {/* Nagad / Rocket */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
                    <Link href={`/signup?plan=${p.id}`} className="bp-btn bp-btn-ghost" style={{ padding: '.55rem .8rem', fontSize: '.88rem' }}>
                      Nagad
                    </Link>
                    <Link href={`/signup?plan=${p.id}`} className="bp-btn bp-btn-ghost" style={{ padding: '.55rem .8rem', fontSize: '.88rem' }}>
                      Rocket
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <p className="bp-muted" style={{ marginTop: '1rem', textAlign: 'center', fontSize: '.78rem' }}>
          bKash / Nagad / Rocket সেন্ড মানি, কার্ড (Stripe/PayPal) — ৭ দিন মানি-ব্যাক
        </p>
      </section>

      {/* Bottom CTA */}
      <section className="bp-wrap" style={{ paddingTop: '2rem', paddingBottom: '5.5rem' }}>
        <div className="bp-cta-wrap">
          <div className="bp-scallop bp-scallop-flip" aria-hidden="true" />
          <div className="bp-cta-band">
            <h2 style={{ color: 'var(--bp-card)' }}>ফ্রিতে শুরু করুন, ৭ দিন মানি-ব্যাক</h2>
            <p>SSL সুরক্ষিত, bKash / Nagad / Rocket দিয়ে পেমেন্ট, যেকোনো সময় Cancel</p>
            <Link href="/generate" className="bp-btn bp-btn-light">ফ্রিতে ভিডিও বানান, ৳০</Link>
          </div>
          <div className="bp-scallop" aria-hidden="true" />
        </div>
      </section>

      {/* Sticky CTA */}
      <div className="bp-sticky-cta">
        <div className="bp-wrap bp-sticky-in">
          <div style={{ minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: '.92rem', lineHeight: 1.2 }}>৳৫৯৯ থেকে শুরু</p>
            <p style={{ fontSize: '.74rem', color: 'var(--bp-ink-soft)' }}>৬০০০ ক্রেডিট, bKash ৩০ সেকেন্ডে</p>
          </div>
          <Link href="/signup?plan=starter" className="bp-btn bp-btn-primary" style={{ padding: '.55rem 1.2rem', fontSize: '.88rem' }}>
            এখনই শুরু করুন
          </Link>
        </div>
      </div>

      <div className="bp-wrap" style={{ paddingBottom: '1.5rem' }}>
        <HostaTeaser />
      </div>
    </div>
  );
}
