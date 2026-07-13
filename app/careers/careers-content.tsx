'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  MapPin,
  Briefcase,
  Users,
  Globe,
  Trophy,
  Zap,
  Heart,
  Code2,
  Headphones,
  Rocket,
  CheckCircle2,
  Quote,
  Sparkles,
} from 'lucide-react'

const GREEN = '#0E7C3A'

// Hero stats — role count computed from ROLES below (honest, no hardcoded headcount).
// "Bogura HQ" replaces a fabricated team number. 4.8 reuses the existing site rating.
const WHY = [
  { icon: Trophy, title: 'Impact', body: '৫ কোটি SME এর দোকানের ভিডিও আপনার কোডে চলবে — আসল দেশের আসল সমস্যা।' },
  { icon: Zap, title: 'Learn fast', body: 'GPU, ComfyUI, Bangla NLP, BDIX infra — প্রোডাকশনে শিখুন, টিউটোরিয়ালে নয়।' },
  { icon: Rocket, title: 'Ownership', body: 'ছোট টিম, কালকেই production-এ আপনার কোড। প্রক্সি কাজ নয়।' },
  { icon: Heart, title: 'bKash salary + profit share', body: 'ট্রান্সপারেন্ট বেতন, প্রফিট শেয়ার ১ বছর পর — ডলার কার্ড ঝামেলা নেই।' },
]

type Role = {
  title: string
  cat: 'Engineering' | 'Growth' | 'Support'
  stack: string
  work: string
  tags: string[]
  loc: string
  salary: string
}

const ROLES: Role[] = [
  {
    title: 'Frontend Engineer',
    cat: 'Engineering',
    stack: 'Next.js • Tailwind • TypeScript',
    work: 'Build the studio timeline drag-drop 9:16 editor — the core of video creation.',
    tags: ['Next.js', 'Tailwind', 'Drag-drop'],
    loc: 'Remote / Dhaka',
    salary: '৳50k–৳120k',
  },
  {
    title: 'Backend / GPU Engineer',
    cat: 'Engineering',
    stack: 'Node • ComfyUI • MinIO • CUDA',
    work: 'Reduce render 30s → 10s. Own the video pipeline end-to-end.',
    tags: ['Node', 'ComfyUI', 'GPU'],
    loc: 'Remote / Bogura',
    salary: '৳60k–৳120k',
  },
  {
    title: 'Bangla NLP Engineer',
    cat: 'Engineering',
    stack: 'Python • TTS • Whisper',
    work: 'Fix য-ফলা in TTS, build Bogura-voice models. The hardest Bangla problem.',
    tags: ['Python', 'TTS', 'Bangla'],
    loc: 'Remote',
    salary: '৳50k–৳110k',
  },
  {
    title: 'DevOps / Infra',
    cat: 'Engineering',
    stack: 'Docker • Nginx • BDIX',
    work: '99.9% uptime across hosting + render farm. Own the BDIX stack.',
    tags: ['Docker', 'Nginx', 'BDIX'],
    loc: 'Dhaka / Bogura',
    salary: '৳50k–৳100k',
  },
  {
    title: 'Growth / Community',
    cat: 'Growth',
    stack: 'Content • Daraz sellers',
    work: 'Teach Daraz sellers to make videos. Tutorials, webinars, BD GTM.',
    tags: ['Content', 'Community', 'GTM'],
    loc: 'Remote',
    salary: '৳40k–৳80k',
  },
  {
    title: 'Support Hero',
    cat: 'Support',
    stack: 'Bangla • bKash • Patience',
    work: 'Bogura office, 12 min avg reply. Real humans, no bot scripts.',
    tags: ['Bangla', 'bKash', 'Support'],
    loc: 'Bogura',
    salary: '৳40k–৳70k',
  },
]

const BENEFITS = [
  { icon: Heart, title: 'bKash salary 1st', body: 'মাসের ১ তারিখে bKash এ বেতন — কার্ড ঝামেলা নেই।' },
  { icon: Globe, title: 'Work from village', body: '১০০% রিমোট, ৭ দিন গ্রামে থাকলে অন করুন।' },
  { icon: Code2, title: 'MacBook provided', body: 'কাজের জন্য MacBook + ২৪" মনিটর।' },
  { icon: Sparkles, title: '৳20k learning', body: 'বছরে ৳20k কোর্স/বই — GPU ক্লাউডও কভার।' },
  { icon: Users, title: '20 days leave', body: 'পাবলিক + ক্যাজুয়াল, Eid বোনাস আলাদা।' },
  { icon: Trophy, title: 'Profit share', body: '১ বছর পর প্রফিট শেয়ার — কোম্পানির মালিক হন।' },
]

const PROCESS = [
  { n: '1', t: '২ মিনিট ফর্ম', d: 'GitHub + কেন আপনি চান, স্রিফ।' },
  { n: '2', t: 'Take-home বাগ', d: 'আসল Hostamar বাগ ফিক্স করুন — ২৪ ঘণ্টা।' },
  { n: '3', t: '৩০ মিনিট ফাউন্ডার চ্যাট', d: 'টেক + ভিশন, কোড নিয়ে কথা।' },
  { n: '4', t: '৪৮ ঘণ্টায় অফার', d: '৫ রাউন্ড নয় — দ্রুত সিদ্ধান্ত।' },
]

const FAQS = [
  { q: 'রিমোট কি?', a: 'হ্যাঁ, ১০০% রিমোট। বগুড়া অফিস আছে চাইলে বসতে পারেন।' },
  { q: 'ফ্রেশার নেওয়া হয়?', a: 'হ্যাঁ। শুধু রেজুমি নয় — take-home বাগ দেখি আপনি কাজ করতে পারেন কি না।' },
  { q: 'ভাষা কী?', a: 'কাজ বাংলা + ইংরেজি দুটোই। কোড ইংরেজি, কমিউনিকেশন বাংলা।' },
]

const CATS = ['All', 'Engineering', 'Growth', 'Support'] as const

// JobPosting structured data — Frontend + Backend only (per spec),
// BDT baseSalary, Hostamar as hiringOrganization, Dhaka remote.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hostamar.com'
const jobPostingLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: 'Frontend Engineer (Next.js)',
    description: 'Build the studio timeline drag-drop 9:16 video editor in Next.js + Tailwind.',
    datePosted: '2026-07-01',
    employmentType: 'FULL_TIME',
    hiringOrganization: {
      '@type': 'Organization',
      name: 'Hostamar',
      sameAs: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
    },
    jobLocation: {
      '@type': 'Place',
      address: { '@type': 'PostalAddress', addressLocality: 'Dhaka', addressCountry: 'BD' },
    },
    baseSalary: {
      '@type': 'MonetaryAmount',
      currency: 'BDT',
      value: { '@type': 'QuantitativeValue', minValue: 50000, maxValue: 120000, unitText: 'MONTH' },
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: 'Backend / GPU Engineer (ComfyUI)',
    description: 'Own the video render pipeline. Reduce render 30s to 10s on GPU.',
    datePosted: '2026-07-01',
    employmentType: 'FULL_TIME',
    hiringOrganization: {
      '@type': 'Organization',
      name: 'Hostamar',
      sameAs: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
    },
    jobLocation: {
      '@type': 'Place',
      address: { '@type': 'PostalAddress', addressLocality: 'Bogura', addressCountry: 'BD' },
    },
    baseSalary: {
      '@type': 'MonetaryAmount',
      currency: 'BDT',
      value: { '@type': 'QuantitativeValue', minValue: 60000, maxValue: 120000, unitText: 'MONTH' },
    },
  },
]

export default function CareersContent() {
  const [cat, setCat] = useState<(typeof CATS)[number]>('All')
  const openCount = ROLES.length
  const shown = cat === 'All' ? ROLES : ROLES.filter((r) => r.cat === cat)

  return (
    <div className="min-h-screen bg-[#FCFCF9] text-zinc-900 antialiased">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingLd) }}
      />

      <div className="mx-auto max-w-[1240px] px-4 md:px-6 py-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-zinc-500 hover:text-zinc-800 transition">
          <ArrowLeft className="w-4 h-4" /> হোমে ফিরুন
        </Link>
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 pb-14">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#0E7C3A] bg-[#0E7C3A]/10 px-3 py-1 rounded-full">
          <Briefcase className="w-3.5 h-3.5" /> ক্যারিয়ার
        </span>
        <h1 className="bangla text-[32px] md:text-[44px] font-bold leading-[1.15] tracking-[-0.02em] mt-5 max-w-[760px]">
          বাংলাদেশের জন্য বানান,<br />বিশ্বের জন্য শিপ করুন
        </h1>
        <p className="bangla text-[15px] md:text-[16px] text-zinc-600 leading-[1.7] mt-5 max-w-[560px]">
          Canva + Vercel + Replit কে বাংলা + bKash দিয়ে rebuild করছি। Bogura থেকে global product।
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-9 max-w-[760px]">
          <div className="rounded-2xl bg-white border border-zinc-200 p-4 text-center">
            <div className="text-[24px] font-bold">{openCount}</div>
            <div className="bangla text-[12px] text-zinc-500 mt-0.5">ওপেন রোল</div>
          </div>
          <div className="rounded-2xl bg-white border border-zinc-200 p-4 text-center">
            <div className="text-[24px] font-bold">১০০%</div>
            <div className="bangla text-[12px] text-zinc-500 mt-0.5">রিমোট</div>
          </div>
          <div className="rounded-2xl bg-white border border-zinc-200 p-4 text-center">
            <div className="text-[24px] font-bold">4.8</div>
            <div className="bangla text-[12px] text-zinc-500 mt-0.5">হ্যাপিনেস</div>
          </div>
          <div className="rounded-2xl bg-white border border-zinc-200 p-4 text-center">
            <div className="text-[24px] font-bold">Bogura</div>
            <div className="bangla text-[12px] text-zinc-500 mt-0.5">HQ</div>
          </div>
        </div>
      </section>

      {/* Why join */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 py-12">
        <h2 className="bangla text-[26px] md:text-[30px] font-bold mb-8">কেন জয়েন করবেন</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {WHY.map((w) => {
            const Icon = w.icon
            return (
              <div key={w.title} className="rounded-[22px] bg-white border border-zinc-200 p-6">
                <div className="h-12 w-12 rounded-xl bg-[#0E7C3A]/10 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-[#0E7C3A]" />
                </div>
                <h3 className="bangla font-semibold text-[18px]">{w.title}</h3>
                <p className="bangla text-[14px] text-zinc-600 leading-[1.6] mt-2">{w.body}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Open roles */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 py-12">
        <h2 className="bangla text-[26px] md:text-[30px] font-bold mb-2">ওপেন রোল</h2>
        <p className="bangla text-[14px] text-zinc-500 mb-6">{openCount}টি পজিশন — আপনারটা খুঁজে নিন।</p>

        <div className="flex flex-wrap gap-2 mb-7">
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`bangla px-4 h-9 rounded-full text-[13px] font-medium transition ${
                cat === c ? 'bg-[#0E7C3A] text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              {c === 'All' ? 'সব' : c}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {shown.map((r) => (
            <div key={r.title} className="rounded-[22px] bg-white border border-zinc-200 p-6 hover:border-[#0E7C3A]/40 transition flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="bangla font-semibold text-[18px]">{r.title}</h3>
                  <div className="text-[12.5px] text-zinc-500 mt-1">{r.stack}</div>
                </div>
                <span className="bangla text-[11px] font-semibold text-[#0E7C3A] bg-[#0E7C3A]/10 px-2.5 py-1 rounded-full whitespace-nowrap">
                  {r.cat}
                </span>
              </div>
              <p className="bangla text-[13.5px] text-zinc-600 leading-[1.6] mt-3 flex-1">{r.work}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {r.tags.map((t) => (
                  <span key={t} className="text-[11px] text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md">{t}</span>
                ))}
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-100">
                <div className="flex items-center gap-3 text-[12px] text-zinc-500">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {r.loc}</span>
                  <span className="font-semibold text-zinc-800">{r.salary}</span>
                </div>
                <Link href="/signup" className="bangla text-[13px] font-semibold text-[#0E7C3A] hover:gap-1.5 transition-all">
                  আবেদন →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 py-12">
        <h2 className="bangla text-[26px] md:text-[30px] font-bold mb-8">বেনিফিটস</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {BENEFITS.map((b) => {
            const Icon = b.icon
            return (
              <div key={b.title} className="rounded-[22px] bg-zinc-50 border border-zinc-100 p-6">
                <div className="h-11 w-11 rounded-xl bg-white border border-zinc-200 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-[#0E7C3A]" />
                </div>
                <h3 className="bangla font-semibold text-[16px]">{b.title}</h3>
                <p className="bangla text-[13.5px] text-zinc-600 leading-[1.6] mt-1.5">{b.body}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Hiring process */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 py-12">
        <h2 className="bangla text-[26px] md:text-[30px] font-bold mb-8">হায়ারিং প্রসেস</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PROCESS.map((p) => (
            <div key={p.n} className="rounded-[22px] bg-white border border-zinc-200 p-6">
              <div className="h-9 w-9 rounded-full bg-[#0E7C3A] text-white font-bold flex items-center justify-center mb-4">{p.n}</div>
              <h3 className="bangla font-semibold text-[16px]">{p.t}</h3>
              <p className="bangla text-[13px] text-zinc-600 leading-[1.6] mt-1.5">{p.d}</p>
            </div>
          ))}
        </div>
        <p className="bangla text-[13px] text-zinc-500 mt-4">৫ রাউন্ড নয় — ৪৮ ঘণ্টায় সিদ্ধান্ত।</p>
      </section>

      {/* Life + FAQ */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 py-12">
        <div className="grid md:grid-cols-[1fr_1fr] gap-8">
          <div className="rounded-[24px] bg-[#0E7C3A] text-white p-8">
            <div className="flex items-start gap-3">
              <Quote className="w-7 h-7 shrink-0 opacity-80" />
              <p className="bangla text-[18px] font-semibold leading-[1.5]">
                এখানে কাজ মানে দেশের জন্য কিছু একটা বানানো — শুধু স্প্রিন্ট নয়।
              </p>
            </div>
            <div className="flex items-center gap-2 mt-6 text-[13px] opacity-80">
              <MapPin className="w-4 h-4" /> Bogura HQ • Dhaka BDIX • ১০০% রিমোট
            </div>
          </div>

          <div>
            <h2 className="bangla text-[22px] font-bold mb-5">সচরাচর জিজ্ঞাসা</h2>
            <div className="rounded-[20px] bg-white border border-zinc-200 divide-y divide-zinc-100 overflow-hidden">
              {FAQS.map((f) => (
                <div key={f.q} className="px-5 py-4">
                  <div className="bangla font-medium text-[14.5px]">{f.q}</div>
                  <div className="bangla text-[13px] text-zinc-600 leading-[1.6] mt-1.5">{f.a}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 py-14 text-center">
        <h2 className="bangla text-[24px] md:text-[28px] font-bold">রেডি বাংলাদেশের জন্য বানাতে?</h2>
        <Link href="/signup" className="bangla inline-flex items-center gap-1.5 mt-5 px-6 h-12 rounded-full bg-[#0E7C3A] text-white text-[15px] font-semibold hover:bg-[#0c6a32] transition">
          আবেদন করুন <CheckCircle2 className="w-4 h-4" />
        </Link>
      </section>
    </div>
  )
}
