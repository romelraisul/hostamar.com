'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Sparkles, Zap, MessageSquare, Globe, Code2, Gamepad2, ShieldCheck } from 'lucide-react'

const GREEN = '#0E7C3A'

type Plan = {
  id: string
  name: string
  tagline: string
  monthly: number
  badge?: string
  cta: string
  ctaVariant: 'primary' | 'ghost' | 'dark'
  features: string[]
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'ফ্রি — শুরু করুন',
    monthly: 0,
    cta: 'ফ্রি শুরু করুন',
    ctaVariant: 'ghost',
    features: [
      'ভিডিও ৩টি (ওয়াটারমার্ক সহ)',
      'চ্যাট ৫০ মেসেজ',
      'ব্রাউজার ২০ সামারি',
      'IDE ১০ ঘণ্টা',
      'গেমিং ফ্রি প্লে',
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'সলো ক্রিয়েটরদের জন্য',
    monthly: 2000,
    badge: 'Most Popular',
    cta: '৭ দিন ফ্রি ট্রায়াল',
    ctaVariant: 'primary',
    features: [
      'ভিডিও ১০টি (ওয়াটারমার্ক ছাড়া)',
      'হোস্টিং ৫GB SSD',
      'চ্যাট আনলিমিটেড',
      'ব্রাউজার আনলিমিটেড',
      'IDE ১০০ ঘণ্টা',
      'গেমিং ১০% ডিসকাউন্ট',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    tagline: 'এজেন্সি ও টিম',
    monthly: 3500,
    cta: '৭ দিন ফ্রি ট্রায়াল',
    ctaVariant: 'dark',
    features: [
      'VPS 2CPU 4GB',
      'ভিডিও ২০টি (৪K)',
      'কাস্টম টপিকস',
      'সোশাল শিডিউলার',
      'চ্যাট API',
      'IDE ৩০০ ঘণ্টা',
      'প্রাইভেট টুর্নামেন্ট',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'আনলিমিটেড বিজনেস',
    monthly: 6000,
    cta: 'যোগাযোগ করুন',
    ctaVariant: 'dark',
    features: [
      'আনলিমিটেড সবকিছু',
      'হোয়াইট-লেবেল',
      'আমরাই পোস্ট করে দেব',
      'ডেডিকেটেড ম্যানেজার',
    ],
  },
]

type Row = { label: string; free: string; starter: string; business: string; enterprise: string }
const COMPARISON: Row[] = [
  { label: 'ভিডিও', free: '৩টি (ওয়াটারমার্ক)', starter: '১০টি', business: '২০টি (৪K)', enterprise: 'আনলিমিটেড' },
  { label: 'Hosting SSD', free: '—', starter: '৫ GB', business: 'VPS 2CPU/4GB', enterprise: 'আনলিমিটেড' },
  { label: 'চ্যাট', free: '৫০ মেসেজ', starter: 'আনলিমিটেড', business: 'API সহ', enterprise: 'আনলিমিটেড + API' },
  { label: 'ব্রাউজার', free: '২০ সামারি', starter: 'আনলিমিটেড', business: 'আনলিমিটেড', enterprise: 'আনলিমিটেড' },
  { label: 'IDE', free: '১০ ঘণ্টা', starter: '১০০ ঘণ্টা', business: '৩০০ ঘণ্টা', enterprise: 'আনলিমিটেড' },
  { label: 'গেমিং', free: 'ফ্রি প্লে', starter: '১০% ডিসকাউন্ট', business: 'প্রাইভেট টুর্নামেন্ট', enterprise: 'কাস্টম প্রাইজ' },
  { label: 'SSL', free: '—', starter: 'ফ্রি', business: 'ফ্রি', enterprise: 'ফ্রি' },
  { label: 'ব্যাকআপ', free: '—', starter: 'ডেইলি', business: 'আওয়ারলি', enterprise: 'রিয়েলটাইম' },
  { label: 'সাপোর্ট', free: 'কমিউনিটি', starter: 'ইমেইল', business: 'প্রায়োরিটি', enterprise: 'ডেডিকেটেড' },
]

const FAQS = [
  { q: 'HostSeba / ExonHost থেকে আলাদা কী?', a: 'ওরা শুধু হোস্টিং দেয়। আমরা AI ভিডিও + হোস্টিং + চ্যাট + ব্রাউজার + IDE + গেমিং — ৬ টি প্রোডাক্ট এক সাবস্ক্রিপশনে। একই ৳২,০০০-এ আপনি ৬ টুল পান।' },
  { q: 'bKash দিয়ে পেমেন্ট কতক্ষণে অ্যাক্টিভ হবে?', a: 'ট্রাঞ্জেকশন আইডি দিলে ৩০ সেকেন্ডের মধ্যে আপনার প্ল্যান অ্যাক্টিভ হয়ে যায়। Nagad ও Rocket-ও সাপোর্ট করি।' },
  { q: 'ওয়াটারমার্ক কবে থাকে?', a: 'Free প্ল্যানে ছোট ওয়াটারমার্ক থাকে। Starter এবং তার ওপরের যেকোনো প্ল্যানে ওয়াটারমার্ক পুরোপুরি চলে যায়।' },
  { q: 'যেকোনো সময় Cancel করা যাবে?', a: 'হ্যাঁ। ৭ দিন ফ্রি ট্রায়াল — কোনো ক্রেডিট কার্ড লাগে না। পছন্দ না হলে যেকোনো সময় Cancel করতে পারেন, আর চার্জও হবে না।' },
  { q: 'ডিস্ক স্পেস কতটুকু?', a: 'Starter-এ ৫GB SSD, Business-এ VPS 2CPU/4GB, Enterprise-এ আনলিমিটেড। ভিডিও, হোস্টিং ও ব্যাকআপ সব একই স্টোরেজে।' },
  { q: 'গেমিং টুর্নামেন্টের পেআউট কীভাবে?', a: 'Business-এ প্রাইভেট টুর্নামেন্ট খুলতে পারেন, Enterprise-এ কাস্টম প্রাইজ পুল। বিজয়ীদের bKash-এ পেআউট আমরাই হ্যান্ডেল করি।' },
]

export default function PricingPage() {
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly')

  return (
    <div className="min-h-screen bg-[#FCFCF9] text-zinc-900">
      {/* Top banner */}
      <div className="w-full bg-[#0E7C3A] text-white text-[13px] md:text-sm">
        <div className="mx-auto max-w-[1240px] px-4 md:px-6 py-2.5 flex items-center justify-center gap-2 text-center">
          <span className="bangla font-medium tracking-[-0.01em]">
            ৭ দিন ফ্রি ট্রায়াল — কোনো ক্রেডিট কার্ড লাগবে না • যেকোনো সময় Cancel
          </span>
        </div>
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 pt-12 md:pt-20 pb-10 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-[12px] font-medium text-zinc-600 mb-5">
          <Sparkles className="h-3.5 w-3.5 text-[#0E7C3A]" /> Simple Pricing
        </div>
        <h1 className="text-[34px] md:text-[52px] font-bold tracking-[-0.03em] leading-[1.05]">
          সব প্রোডাক্ট, <span style={{ color: GREEN }}>এক দামে</span>
        </h1>
        <p className="bangla mt-4 text-[15px] md:text-[17px] text-zinc-500 max-w-[640px] mx-auto">
          ভিডিও, হোস্টিং, চ্যাট, ব্রাউজার, IDE আর গেমিং — ৬ টি টুল এক সাবস্ক্রিপশনে।
          bKash, Nagad, Rocket দিয়ে ৩০ সেকেন্ডে শুরু করুন।
        </p>

        {/* Monthly / Yearly toggle */}
        <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white p-1">
          <button
            onClick={() => setCycle('monthly')}
            className={`rounded-full px-5 py-2 text-[14px] font-medium transition ${
              cycle === 'monthly' ? 'bg-zinc-900 text-white' : 'text-zinc-600'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setCycle('yearly')}
            className={`rounded-full px-5 py-2 text-[14px] font-medium transition ${
              cycle === 'yearly' ? 'bg-zinc-900 text-white' : 'text-zinc-600'
            }`}
          >
            Yearly <span className="ml-1 text-[12px] text-[#0E7C3A] font-semibold">সেভ ২০%</span>
          </button>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6">
        <div className="grid gap-5 lg:grid-cols-4 items-stretch">
          {PLANS.map((p) => {
            const popular = p.id === 'starter'
            const yearly = cycle === 'yearly' && p.monthly > 0
            return (
              <div
                key={p.id}
                className={`relative flex flex-col rounded-[20px] border bg-white p-6 ${
                  popular
                    ? 'border-[#0E7C3A] shadow-[0_20px_60px_-20px_rgba(14,124,58,0.35)] ring-1 ring-[#0E7C3A]/20 lg:-mt-3 lg:pb-10'
                    : 'border-zinc-200 hover:border-zinc-300 hover:shadow-[0_12px_32px_-16px_rgba(0,0,0,0.12)]'
                }`}
              >
                {p.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <div className="rounded-full bg-[#0E7C3A] px-3.5 py-1 text-[11px] font-bold tracking-wide text-white shadow">
                      {p.badge}
                    </div>
                  </div>
                )}
                <div className="mb-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-[20px] font-semibold tracking-tight">{p.name}</h3>
                      <p className="bangla mt-0.5 text-[13px] text-zinc-500">{p.tagline}</p>
                    </div>
                    {p.id === 'free' && (
                      <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium">চিরকাল ফ্রি</span>
                    )}
                  </div>
                  <div className="mt-5 flex items-baseline gap-1.5">
                    <span className="text-[34px] font-bold tracking-[-0.03em] leading-none">৳{p.monthly.toLocaleString()}</span>
                    <span className="text-[13px] text-zinc-500">/month</span>
                  </div>
                  {yearly && (
                    <div className="mt-1.5 flex items-center gap-2 text-[12px]">
                      <span className="line-through text-zinc-400">৳{p.monthly.toLocaleString()}</span>
                      <span className="rounded-full bg-[#0E7C3A]/10 px-2 py-0.5 font-medium text-[#0E7C3A]">
                        ৳{Math.round(p.monthly * 0.8 * 12).toLocaleString()} / year
                      </span>
                    </div>
                  )}
                </div>

                <div className="mb-6 space-y-2.5">
                  {p.features.map((f) => (
                    <div key={f} className="flex items-start gap-2.5 text-[13.5px] leading-6">
                      <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${popular ? 'bg-[#0E7C3A] text-white' : 'bg-zinc-900 text-white'}`}>
                        <Check className="h-3 w-3" />
                      </span>
                      <span className="bangla text-zinc-700">{f}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-auto">
                  <Link
                    href={`/signup?plan=${p.id}`}
                    className={`flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-[14px] font-semibold transition ${
                      p.ctaVariant === 'primary'
                        ? 'bg-[#0E7C3A] text-white hover:bg-[#0c6a31] shadow-[0_8px_20px_-10px_rgba(14,124,58,0.6)]'
                        : p.ctaVariant === 'dark'
                        ? 'bg-zinc-900 text-white hover:bg-black'
                        : 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'
                    }`}
                  >
                    {p.cta}
                  </Link>
                  {popular && (
                    <p className="bangla mt-3 text-center text-[11px] leading-4 text-zinc-500">
                      ৭ দিন ফ্রি • Cancel anytime • bKash এ পে করুন
                    </p>
                  )}
                </div>

                {/* Bundle chips */}
                <div className="mt-5 rounded-2xl bg-[#FCFCF9] border border-zinc-200/80 p-3">
                  <div className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">Included in bundle</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[
                      { l: 'Video', i: Zap },
                      { l: 'Hosting', i: ShieldCheck },
                      { l: 'Chat', i: MessageSquare },
                      { l: 'Browser', i: Globe },
                      { l: 'IDE', i: Code2 },
                      { l: 'Gaming', i: Gamepad2 },
                    ].map(({ l, i: Ic }) => (
                      <span key={l} className="inline-flex items-center gap-1 rounded-full bg-white border border-zinc-200 px-2.5 py-1 text-[11px] font-medium">
                        <Ic className="h-3 w-3 text-zinc-500" /> {l}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Bundle objection killer */}
        <div className="mx-auto mt-6 flex flex-col md:flex-row items-center justify-center gap-2 md:gap-3 rounded-full bg-white border border-zinc-200 px-4 py-3 text-[13px] text-zinc-600 shadow-sm">
          <span className="inline-flex items-center gap-1.5 font-medium text-zinc-900">
            <Zap className="h-4 w-4" /> Video Business কিনলে Hosting Free
          </span>
          <span className="hidden md:block h-3 w-px bg-zinc-200" />
          <span className="bangla">সব প্ল্যানে bKash, Nagad, Rocket • ৭ দিন ফ্রি ট্রায়াল • SSL ফ্রি</span>
        </div>
      </section>

      {/* Comparison table */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 py-12 md:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="bangla text-[28px] md:text-[36px] font-bold tracking-[-0.02em] leading-tight">
            সব ফিচার এক নজরে তুলনা করুন
          </h2>
          <p className="bangla mt-3 text-zinc-600">
            একই দামে কেন HostAmar বেস্ট ভ্যালু — ৬ টি প্রোডাক্ট একসাথে
          </p>
        </div>

        <div className="mt-8 overflow-hidden rounded-[24px] border border-zinc-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-[13.5px]">
              <thead>
                <tr className="border-b border-zinc-200 bg-[#FCFCF9]">
                  <th className="px-5 py-4 text-left font-semibold text-zinc-500">ফিচার</th>
                  {['Free', 'Starter', 'Business', 'Enterprise'].map((h) => (
                    <th key={h} className={`px-5 py-4 text-center font-semibold ${h === 'Starter' ? 'text-[#0E7C3A]' : 'text-zinc-900'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((r, idx) => (
                  <tr key={r.label} className={idx % 2 ? 'bg-[#FCFCF9]/50' : ''}>
                    <td className="px-5 py-3.5 font-medium text-zinc-900">{r.label}</td>
                    {[r.free, r.starter, r.business, r.enterprise].map((v, i) => (
                      <td key={i} className={`px-5 py-3.5 text-center bangla ${i === 1 ? 'font-semibold text-[#0E7C3A]' : 'text-zinc-600'}`}>
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-[760px] px-4 md:px-6 pb-20">
        <h2 className="bangla text-center text-[28px] md:text-[34px] font-bold tracking-[-0.02em]">
          সচরাচর জিজ্ঞাসা
        </h2>
        <div className="mt-8 space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-zinc-200 bg-white px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-[15px] font-medium text-zinc-900">
                <span className="bangla">{f.q}</span>
                <span className="text-[#0E7C3A] transition group-open:rotate-45">+</span>
              </summary>
              <p className="bangla mt-3 text-[14px] leading-6 text-zinc-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

    </div>
  )
}
