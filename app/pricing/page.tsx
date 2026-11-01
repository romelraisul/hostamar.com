// Bazaar Poster pricing (Direction C, 2026-09). SERVER component — all prices
// and USD strings render from the build-time BDT_RATE (lib/pricing): no client
// fetch, no post-paint DOM mutation, no layout shift (PSI 2026-10-18). The
// only client JS is the island in components/pricing-actions.tsx (bKash TrxID
// verify + Stripe/PayPal). Billing paths preserved verbatim:
// /api/billing/create-checkout, /api/billing/verify-trx (V17 rule: credits
// granted on approval, never claimed client-side).

import Link from 'next/link'
import { Sparkles, Coins } from 'lucide-react'
import { PLANS, BDT_RATE, toBn, toBnInt, usdFromTaka } from '@/lib/pricing'
import { TrxVerify, CheckoutButtons } from '@/components/pricing-actions'

// Brand
const BKASH = '#E2136E'

// ponytail: 86400 — same rationale as app/page.tsx (CPU ceiling kills runtime
// re-renders; 3600 degraded to stale-serve s-maxage=2 between deploys).
export const revalidate = 86400

// SEO
export const metadata = {
  title: 'Pricing ৳990/1900/2900 - Sovereign EU+BD GPU | Hostamar',
  description: 'বাংলাদেশি ব্যবসার জন্য AI মার্কেটিং ভিডিও + BDIX হোস্টিং — ৫০+ বাংলা টেমপ্লেট, bKash/Nagad/Rocket।',
  alternates: { canonical: 'https://hostamar.com/pricing' },
}

const pricingJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Hostamar AI Marketing + Hosting',
  description: 'বাংলাদেশি ব্যবসার জন্য AI মার্কেটিং ভিডিও + BDIX হোস্টিং — ৫০+ বাংলা টেমপ্লেট, bKash/Nagad/Rocket।',
  brand: { '@type': 'Brand', name: 'Hostamar' },
  offers: [
    { '@type': 'Offer', name: 'Starter', price: '990', priceCurrency: 'BDT', url: 'https://hostamar.com/pricing', priceValidUntil: '2026-12-31' },
    { '@type': 'Offer', name: 'Pro', price: '1900', priceCurrency: 'BDT', url: 'https://hostamar.com/pricing', priceValidUntil: '2026-12-31' },
    { '@type': 'Offer', name: 'Business', price: '2900', priceCurrency: 'BDT', url: 'https://hostamar.com/pricing', priceValidUntil: '2026-12-31' },
  ],
}

export default function PricingPage() {
  const rate = BDT_RATE

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

      {/* Welcome banner + Binance P2P rate — STATIC (was client-fetch gated → CLS) */}
      <div className="bp-wrap" style={{ paddingTop: '1.4rem' }}>
        <div className="rounded-2xl border border-[#0E7C3A]/25 bg-gradient-to-r from-[#0E7C3A]/8 to-transparent p-5">
          <p className="text-lg font-bold text-[#0F172A]">
            Create account and get{' '}
            <span className="text-[#0E7C3A]">6000 Taka</span>{' '}
            <span className="text-base font-semibold text-slate-500">≈ ${usdFromTaka(6000, rate)} USD</span>
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Chat with 100+ AI models, generate videos, host servers. No card needed.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            6000 Taka = 6000 GPT-4o-mini chats · or 40 videos · or 10 months Starter hosting
          </p>
        </div>
        <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '.8rem' }}>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0E7C3A]/10 px-3 py-1 text-xs font-medium text-[#0E7C3A]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0E7C3A] opacity-60 text-white" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0E7C3A] text-white" />
            </span>
            Binance P2P: 1 USDT ≈ {toBn(rate.toFixed(2))} BDT — not bank rate
          </span>
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
          <p className="bp-muted" style={{ marginTop: '.5rem', fontWeight: 700 }}>
            ১cr = ১ টাকা = ১ HOST কয়েন — প্রতি প্ল্যানে ক্রেডিট, bKash <span style={{ fontWeight: 800 }}>01822417463</span>
          </p>
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

                  {/* Card checkout (Stripe/PayPal) — shared client island */}
                  <CheckoutButtons planId={p.id} />

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

      {/* Bangla LLM Training 5000cr — one-time product, full-width tile */}
      <section className="bp-wrap" style={{ paddingBottom: '1.5rem' }}>
        <div className="bp-tile" style={{ borderWidth: 3, display: 'flex', flexWrap: 'wrap', gap: '1.4rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <span className="bp-rosette" style={{ background: 'var(--bp-green)', color: '#fff' }}>NEW</span>
            <span className="bp-plan-name">বাংলা LLM ট্রেনিং</span>
            <p style={{ fontSize: '.82rem', margin: '.15rem 0 0' }}>নিজের মডেল — QLoRA RTX 5060 8GB, LitGPT</p>
            <div className="bp-price">৳5,000 <small>/ একবার · 5000cr</small></div>
            <ul className="bp-check" style={{ margin: '.8rem 0 0' }}>
              <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l4 4L19 7" /></svg>Llama-3 / Mistral QLoRA fine-tuning</li>
              <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l4 4L19 7" /></svg>JSONL dataset builder + selfcheck</li>
              <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l4 4L19 7" /></svg>১০০০ inference call ফ্রি — api.hostamar.com/v1</li>
              <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l4 4L19 7" /></svg>১৫৩ মডেল gateway-এ deploy</li>
            </ul>
          </div>
          <div style={{ flex: '0 1 260px', display: 'grid', gap: '.55rem' }}>
          <Link href="/payment?plan=bangla_llm" className="bp-btn bp-btn-primary">5000cr দিয়ে শুরু করুন</Link>
          <a href="https://hostamar.com/bangla-llm#pricing" className="bp-btn bp-btn-ghost" style={{ background: BKASH, color: '#fff' }}>bKash 01822417463</a>
            <p className="bp-muted" style={{ fontSize: '.75rem', textAlign: 'center', margin: 0 }}>
              ৫০০০ টাকা = ৫০০০ HOST coin · ৭ দিন মানিব্যাক
            </p>
          </div>
        </div>
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

      {/* Trust badges + FAQ — conversion section (Phase 2.1). Static, no client JS. */}
      <section className="bp-wrap" style={{ paddingBottom: '1.5rem' }}>
        <div className="bp-stamp-row" style={{ justifyContent: 'center', paddingBottom: '1.2rem' }}>
          <span className="bp-stamp" style={{ color: '#E2136E' }}>bKash</span>
          <span className="bp-stamp" style={{ color: '#F6921E' }}>Nagad</span>
          <span className="bp-stamp">
            <svg className="bp-stamp-ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
            SSL সিকিউর
          </span>
          <span className="bp-stamp">
            <svg className="bp-stamp-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13a8 8 0 0 1 16 0" /><rect x="3" y="13" width="4" height="6" rx="1.5" /><rect x="17" y="13" width="4" height="6" rx="1.5" /><path d="M19 19a3 3 0 0 1-3 2h-2" /></svg>
            ২৪/৭ সাপোর্ট
          </span>
        </div>
        <h2 style={{ textAlign: 'center', margin: '0 0 1rem' }}>সাধারণ জিজ্ঞাসা</h2>
        <div className="bp-faq" style={{ maxWidth: 680, marginInline: 'auto' }}>
          <details>
            <summary>কেন ৳৯৯০?<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></summary>
            <p>১cr = ১ টাকা — ৳৯৯০ = ৬,০০০ HOST ক্রেডিট + BDIX হোস্টিং + ১০০+ AI মডেল চ্যাট + ৫০+ বাংলা ভিডিও টেমপ্লেট। কোনো লুকানো চার্জ নেই, যেকোনো সময় cancel।</p>
          </details>
          <details>
            <summary>bKash/Nagad দিয়ে পেমেন্ট কীভাবে?<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></summary>
            <p>bKash/Nagad/Rocket সেন্ড মানি <b>01822417463</b>-এ, সাইনআপ করে TrxID ভেরিফাই — ৩০ সেকেন্ডে ক্রেডিট। কার্ড থাকলে Stripe/PayPal, না থাকলেও সমস্যা নেই।</p>
          </details>
          <details>
            <summary>রিফান্ড পাওয়া যায়?<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></summary>
            <p>৭ দিন মানি-ব্যাক গ্যারান্টি — কাজ না করলে TrxID দিয়ে রিফান্ড। সাপোর্ট ২৪/৭ খোলা।</p>
          </details>
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

      {/* $HOSTA teaser — STATIC (was client fetch-gated → CLS). Coin isn't
          listed yet; when /api/market-adjust starts returning a price, move
          this into an ISR route and render the number server-side. */}
      <div className="bp-wrap" style={{ paddingBottom: '1.5rem' }}>
        <div className="mt-12 rounded-2xl border border-dashed border-[#F59E0B]/50 bg-amber-50/40 p-6 text-center">
          <Coins className="mx-auto mb-2 h-6 w-6 text-[#F59E0B]" />
          <h3 className="text-lg font-bold">
            Future $HOSTA Coin — your credits convert 1:1
          </h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
            1 Credit = 1 Taka ≈ {(1 / rate).toFixed(4)} USDT @ {rate.toFixed(2)} BDT (Binance P2P pegged). Total supply 1B $HOSTA.
            Your credits are the pre-mine — every Taka you spend today becomes $HOSTA at listing.
          </p>
          <p className="mt-1 text-xs text-slate-500">599 Taka Starter = ${usdFromTaka(599, rate)} USD @ {rate.toFixed(2)} • 5999.46 Taka ≈ $47.53 ≈ 1234 $HOSTA</p>
        </div>
      </div>
    </div>
  );
}
