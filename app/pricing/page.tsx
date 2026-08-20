'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, X, ShieldCheck, Sparkles } from 'lucide-react'

// Locked brand
const PRIMARY = '#0E7C3A'
const ACCENT = '#F59E0B'
const TEXT = '#0F172A'
const MUTED = '#475569'

// SEO JSON-LD — real BDT offers only, no fake ratings
const pricingJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Hostamar AI Marketing + Hosting',
  description: 'বাংলাদেশি ব্যবসার জন্য AI মার্কেটিং ভিডিও + BDIX হোস্টিং — 50+ বাংলা টেমপ্লেট, bKash/Nagad/Rocket।',
  brand: { '@type': 'Brand', name: 'Hostamar' },
  offers: [
    { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'BDT', url: 'https://hostamar.com/pricing', priceValidUntil: '2026-12-31' },
    { '@type': 'Offer', name: 'Starter', price: '2000', priceCurrency: 'BDT', url: 'https://hostamar.com/pricing', priceValidUntil: '2026-12-31' },
    { '@type': 'Offer', name: 'Pro', price: '3500', priceCurrency: 'BDT', url: 'https://hostamar.com/pricing', priceValidUntil: '2026-12-31' },
  ],
}

type Plan = {
  id: 'free' | 'starter' | 'pro'
  name: string
  priceMonthly: number // BDT
  priceEarlyMonthly?: number // Early 1000/mo promo
  badge?: string
  tagline: string
  cta: string
  features: string[]
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    tagline: 'ট্রাই করুন — ক্রেডিট কার্ড লাগবে না',
    cta: 'ফ্রি শুরু করুন',
    features: [
      '৩টি AI ভিডিও / মাস (ওয়াটারমার্ক সহ)',
      '১GB BDIX হোস্টিং',
      '৫০+ বাংলা টেমপ্লেট (প্রিভিউ)',
      'Chat বেসিক',
      '৭২০p এক্সপোর্ট',
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    priceMonthly: 2000,
    priceEarlyMonthly: 1000,
    badge: 'Most Popular',
    tagline: 'SME দের পছন্দ — ১০০ ভিডিও',
    cta: 'Starter নিন',
    features: [
      '১০০ AI ভিডিও / মাস (ওয়াটারমার্ক ছাড়া)',
      '১০GB NVMe হোস্টিং + ফ্রি .com ডোমেইন',
      '৫০+ বাংলা টেমপ্লেট (ঈদ, বৈশাখ, 11.11) সব',
      'bKash / Nagad / Rocket',
      '১০৮০p, No watermark',
      'Priority সাপোর্ট',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 3500,
    priceEarlyMonthly: 1000,
    tagline: 'এজেন্সি ও টিম — Unlimited',
    cta: 'Pro নিন',
    features: [
      'Unlimited AI ভিডিও',
      '২০GB NVMe + ফ্রি SSL',
      'API এক্সেস + টিম ৫ জন',
      'সব প্রোডাক্ট আনলিমিটেড',
      '4K এক্সপোর্ট',
      'Priority সাপোর্ট',
    ],
  },
]

const COMPARISON = [
  { label: 'AI মার্কেটিং ভিডিও', hostSeba: '—', hostamar: '✓ ৫০+ বাংলা টেমপ্লেট' },
  { label: 'হোস্টিং', hostSeba: '১০GB SSD / ১২০GB BW', hostamar: '১০GB NVMe + .com ফ্রি' },
  { label: 'পেমেন্ট', hostSeba: 'bKash (হোস্টিং)', hostamar: 'bKash / Nagad / Rocket' },
  { label: 'বাৎসরিক খরচ', hostSeba: '৳২,২০০/yr', hostamar: '৳২,০০০/yr' },
  { label: 'ভ্যালু', hostSeba: 'No AI', hostamar: 'AI সহ — ৩× ভ্যালু' },
]

export default function PricingPage() {
  const [early, setEarly] = useState(false)
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null)

  async function startCheckout(plan: 'starter' | 'pro') {
    setCheckoutPlan(plan)
    try {
      const res = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.bkashURL) {
        window.location.href = `/signup?plan=${plan}`
        return
      }
      // GA4
      try { (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.('event', 'bkash_click', { plan }) } catch {}
      try { (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.('event', 'pricing_click', { plan }) } catch {}
      window.location.href = data.bkashURL
    } catch {
      window.location.href = `/signup?plan=${plan}`
    } finally {
      setCheckoutPlan(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0F172A]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd) }} />

      {/* Top — 7 day refund badge */}
      <div className="w-full bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <div className="mx-auto max-w-[1120px] px-4 sm:px-5 lg:px-0 py-2 flex flex-wrap items-center justify-center gap-2 text-[12px]">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#E2E8F0] px-2.5 py-1">
            <ShieldCheck className="h-3.5 w-3.5 text-[#0E7C3A]" /> ৭ দিন মানি-ব্যাক গ্যারান্টি
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0E7C3A] text-white px-2.5 py-1 font-semibold">bKash • Nagad • Rocket</span>
          <span className="text-[#475569]">ক্রেডিট কার্ড লাগবে না</span>
        </div>
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-[1120px] px-4 sm:px-5 lg:px-0 pt-8 sm:pt-12 md:pt-16 pb-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1 text-[12px] font-medium text-[#475569]">
          <Sparkles className="h-3.5 w-3.5 text-[#0E7C3A]" /> Simple Pricing
        </div>
        <h1 className="mt-4 text-[30px] sm:text-[36px] md:text-[44px] font-bold tracking-[-0.03em] leading-[1.05]">
          AI + হোস্টিং, <span style={{ color: PRIMARY }}>এক দামে</span>
        </h1>
        <p className="mt-3 text-[14px] sm:text-[16px] text-[#475569] max-w-[640px] mx-auto leading-[1.6]">
          ভিডিও, হোস্টিং, চ্যাট, ব্রাউজার, IDE — সব এক সাবস্ক্রিপশনে। bKash দিয়ে ৩০ সেকেন্ডে শুরু।
        </p>

        {/* Early toggle — ৳1000/mo */}
        <div className="mt-6 flex flex-col items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-full border border-[#E2E8F0] bg-white p-1">
            <button
              onClick={() => setEarly(false)}
              className={`rounded-full px-4 sm:px-5 py-2 text-[13px] sm:text-[14px] font-medium transition ${!early ? 'bg-[#0F172A] text-white' : 'text-[#475569]'}`}
            >
              Regular
            </button>
            <button
              onClick={() => setEarly(true)}
              className={`rounded-full px-4 sm:px-5 py-2 text-[13px] sm:text-[14px] font-medium transition ${early ? 'bg-[#F59E0B] text-white' : 'text-[#475569]'}`}
            >
              Early ৳১০০০/mo <span className="ml-1 text-[11px] opacity-90">সেভ ৫০%</span>
            </button>
          </div>
          <p className="text-[11px] text-[#64748B]">Early: প্রথম ১০০ কাস্টমার — {early ? 'প্রযোজ্য' : 'টগল করুন'}</p>
        </div>
      </section>

      {/* 3 cards — exactly Free/Starter/Pro, single CTA per card */}
      <section className="mx-auto max-w-[1120px] px-4 sm:px-5 lg:px-0">
        <div className="grid gap-4 md:gap-5 md:grid-cols-3 items-stretch">
          {PLANS.map((p) => {
            const isPopular = p.id === 'starter'
            const displayPrice = early && p.priceEarlyMonthly !== undefined ? p.priceEarlyMonthly : p.priceMonthly
            return (
              <div
                key={p.id}
                className={`relative flex flex-col rounded-[20px] border bg-white p-5 sm:p-6 ${
                  isPopular
                    ? 'border-[#0E7C3A] shadow-[0_16px_40px_-16px_rgba(14,124,58,0.35)] ring-1 ring-[#0E7C3A]/15 md:-mt-2 md:pb-8'
                    : 'border-[#E2E8F0]'
                }`}
              >
                {p.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <div className="rounded-full bg-[#0E7C3A] px-3 py-1 text-[11px] font-bold text-white shadow">{p.badge}</div>
                  </div>
                )}
                <div>
                  <h3 className="text-[18px] font-semibold tracking-tight">{p.name}</h3>
                  <p className="mt-0.5 text-[12px] text-[#64748B]">{p.tagline}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-[32px] font-bold tracking-[-0.03em]">৳{displayPrice.toLocaleString('en-US')}</span>
                    <span className="text-[13px] text-[#64748B]">/মাস</span>
                  </div>
                  {early && p.priceMonthly > 0 && (
                    <div className="mt-1 text-[12px] text-[#64748B]">
                      <span className="line-through">৳{p.priceMonthly.toLocaleString('en-US')}</span>
                      <span className="ml-2 rounded-full bg-[#F59E0B]/15 px-2 py-0.5 font-semibold text-[#92400E]">Early ৳১০০০</span>
                    </div>
                  )}
                </div>

                <ul className="mt-5 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px] leading-6">
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0E7C3A] text-white">
                        <Check className="h-3 w-3" />
                      </span>
                      <span className="text-[#334155]">{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  {p.id === 'free' ? (
                    <Link
                      href="/signup?plan=free"
                      data-ga="pricing_click"
                      className="flex h-11 w-full items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[14px] font-semibold hover:bg-[#F8FAFC]"
                    >
                      {p.cta}
                    </Link>
                  ) : (
                    <button
                      onClick={() => startCheckout(p.id as 'starter' | 'pro')}
                      disabled={checkoutPlan !== null}
                      data-ga="pricing_click"
                      className="flex h-11 w-full items-center justify-center rounded-full bg-[#0E7C3A] text-[14px] font-semibold text-white hover:bg-[#0A5A2B] disabled:opacity-60 shadow-[0_8px_20px_-10px_rgba(14,124,58,0.6)]"
                    >
                      {checkoutPlan === p.id ? 'bKash-এ নিয়ে যাচ্ছি…' : `${p.cta} — bKash`}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <p className="mt-4 text-center text-[11px] text-[#64748B]">Annual: ৳২,০০০/yr Starter • ৳৩,৫০০/yr Pro • bKash/Nagad/Rocket • ভ্যাট সহ ইনভয়েস</p>
      </section>

      {/* Comparison table — HostSeba vs Hostamar */}
      <section className="mx-auto max-w-[1120px] px-4 sm:px-5 lg:px-0 py-10 md:py-12">
        <h2 className="text-center text-[20px] sm:text-[24px] font-bold tracking-[-0.02em]">৳২২০০ No AI vs ৳২,০০০ AI সহ</h2>
        <p className="mt-2 text-center text-[13px] text-[#475569]">HostSeba/ExonHost শুধু হোস্টিং — Hostamar দেয় AI ভিডিও সহ</p>
        <div className="mt-6 overflow-hidden rounded-[16px] border border-[#E2E8F0] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-[13px]">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  <th className="px-4 py-3 text-left font-semibold text-[#475569]">ফিচার</th>
                  <th className="px-4 py-3 text-center font-semibold text-[#475569]">HostSeba (৳২২০০/yr)</th>
                  <th className="px-4 py-3 text-center font-semibold text-[#0E7C3A]">Hostamar (৳২,০০০/yr)</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((r, i) => (
                  <tr key={r.label} className={i % 2 ? 'bg-[#F8FAFC]/60' : 'bg-white'}>
                    <td className="px-4 py-3 font-medium text-[#0F172A]">{r.label}</td>
                    <td className="px-4 py-3 text-center text-[#64748B]">
                      <span className="inline-flex items-center gap-1"><X className="h-3.5 w-3.5 text-[#94A3B8]" /> {r.hostSeba}</span>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-[#0F172A]">
                      <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5 text-[#0E7C3A]" /> {r.hostamar}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-[#E2E8F0] bg-[#0E7C3A]/5 px-4 py-3 text-center text-[13px] font-semibold text-[#0F172A]">
            একই ৳২,০০০-এ হোস্টিং + ৫০+ বাংলা টেমপ্লেট + bKash — ৩× ভ্যালু
          </div>
        </div>
      </section>

      {/* Bottom CTA — gradient ALLOWED 1x per page, final CTA only */}
      <section className="mx-auto max-w-[1120px] px-4 sm:px-5 lg:px-0 pb-12">
        <div className="rounded-[20px] p-[1px]" style={{ background: `linear-gradient(135deg, ${PRIMARY}, ${ACCENT})` }}>
          <div className="rounded-[19px] bg-white px-6 py-6 sm:py-8 text-center">
            <h3 className="text-[18px] sm:text-[20px] font-bold">ফ্রিতে শুরু করুন — ৭ দিন মানি-ব্যাক</h3>
            <p className="mt-1 text-[13px] text-[#475569]">SSL সুরক্ষিত • ভ্যাট সহ ইনভয়েস • যেকোনো সময় Cancel</p>
            <Link href="/generate" className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-[#0E7C3A] px-6 text-[14px] font-semibold text-white hover:bg-[#0A5A2B]">
              ফ্রিতে ভিডিও বানান - ৳০
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
