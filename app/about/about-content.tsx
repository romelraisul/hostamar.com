'use client'

import Link from 'next/link'
import {
  ArrowLeft,
  Cloud,
  Video,
  MessageSquare,
  Globe,
  Code2,
  Gamepad2,
  MapPin,
  Quote,
  Users,
  Heart,
  Zap,
  Sparkles,
} from 'lucide-react'

const GREEN = '#0E7C3A'

// Founder story stats — all numbers mirror existing site claims
// (homepage 500+/10k+/212, contact 12-min, hosting 20ms BDIX). No invented metrics.
const FOUNDER_STATS = [
  { k: '20ms', v: 'BDIX ping' },
  { k: '12 min', v: 'গড় রিপ্লাই' },
  { k: '10k+', v: 'ভিডিও তৈরি' },
]

const TIMELINE = [
  { year: '2024', title: 'আইডিয়া', body: 'দেখলাম SME রা Canva ব্যবহার করতে পারে না, বাংলা ভাঙে, bKash নেই।' },
  { year: '২০২৪ Dec', title: 'MVP', body: 'AI ভিডিও মেকার লঞ্চ — ছবি → ৩০ সেকেন্ডে ভিডিও।' },
  { year: '২০২৫ Mar', title: 'হোস্টিং + bKash', body: 'ইউজাররা চাইল, আমরা যোগ করলাম — bKash অটো পেমেন্ট।' },
  { year: '২০২৫ Jun', title: 'Chat / Browser / Dev', body: 'এক সাবস্ক্রিপশনে সব — ভিডিও, হোস্টিং, চ্যাট, ব্রাউজার, IDE।' },
  { year: '২০২৬ May', title: 'Gaming', body: 'bKash টুর্নামেন্ট — ইনস্ট্যান্ট পেআউট।' },
  { year: 'আজ', title: 'All-in-one OS', body: 'ক্রিয়েটরদের জন্য বাংলাদেশের নিজস্ব অপারেটিং সিস্টেম।' },
]

const VALUES = [
  { icon: Heart, title: 'বাংলা First', body: 'য-ফলা ভাঙবে না, বগুড়ার ভয়েস — আমরা বাংলায় ভাবি।' },
  { icon: Zap, title: 'bKash First', body: 'ডলার কার্ড নয় — bKash, Nagad, Rocket দিয়ে সব পেমেন্ট।' },
  { icon: Sparkles, title: 'Simple First', body: '৩০ সেকেন্ডে ভিডিও — এডিটিং জানার দরকার নেই।' },
]

const PRODUCTS = [
  { icon: Video, name: 'ভিডিও', desc: 'AI মার্কেটিং ভিডিও — পণ্যের ছবি → Reels।' },
  { icon: Cloud, name: 'হোস্টিং', desc: 'VPS + BDIX ২০ms, বাংলা cPanel, ফ্রি SSL।' },
  { icon: MessageSquare, name: 'চ্যাট', desc: 'বাংলা AI — PDF বুঝে, য-ফলা ঠিক।' },
  { icon: Globe, name: 'ব্রাউজার', desc: 'প্রাইভেট AI ব্রাউজার — ইতিহাস আমাদের কাছে নয়।' },
  { icon: Code2, name: 'Dev', desc: 'ক্লাউড IDE — ব্রাউজারেই Python/pandas।' },
  { icon: Gamepad2, name: 'Gaming', desc: 'bKash টুর্নামেন্ট — ৫ মিনিটে পেআউট।' },
]

// Numbers dark card — mirrors existing site claims (homepage/contact/hosting).
const NUMBERS = [
  { k: '500+', v: 'ক্রিয়েটর' },
  { k: '10k+', v: 'ভিডিও' },
  { k: '4.8/5', v: '২১২ রিভিউ' },
  { k: '20ms', v: 'BDIX ping' },
  { k: '12 min', v: 'সাপোর্ট' },
  { k: '7 দিন', v: 'মানি-ব্যাক' },
]

// Roles only — no invented person names beyond the founder (per site sameAs).
const TEAM = [
  { role: 'Founder & CEO', note: 'Romel Raisul' },
  { role: 'CTO — Infra & GPU', note: 'Bogura DC' },
  { role: 'Head of Content — Bangla NLP', note: 'ভয়েস ও ফন্ট' },
  { role: 'Support Lead', note: 'Bogura office' },
]

// Organization structured data — consistent with app/layout.tsx orgJsonLd
// (Bogura address, facebook.com/romelraisul). Adds foundingDate + founder.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hostamar.com'
const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Hostamar',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  foundingDate: '2024',
  founder: { '@type': 'Person', name: 'Romel Raisul' },
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'BD',
    addressLocality: 'Bogura',
  },
  sameAs: ['https://facebook.com/romelraisul'],
  paymentAccepted: 'bKash, Nagad, Rocket, Cash',
  currenciesAccepted: 'BDT',
}

export default function AboutContent() {
  return (
    <div className="min-h-screen bg-[#FCFCF9] text-zinc-900 antialiased">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />

      <div className="mx-auto max-w-[1240px] px-4 md:px-6 py-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-zinc-500 hover:text-zinc-800 transition">
          <ArrowLeft className="w-4 h-4" /> হোমে ফিরুন
        </Link>
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 pb-16">
        <div className="grid md:grid-cols-[1.4fr_1fr] gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#0E7C3A] bg-[#0E7C3A]/10 px-3 py-1 rounded-full">
              <MapPin className="w-3.5 h-3.5" /> বাংলাদেশের জন্য তৈরি
            </span>
            <h1 className="bangla text-[34px] md:text-[44px] font-bold leading-[1.15] tracking-[-0.02em] mt-5">
              আমরা বানাচ্ছি বাংলাদেশের জন্য,<br />
              <span className="text-[#0E7C3A]">Silicon Valley</span> এর জন্য নয়
            </h1>
            <p className="bangla text-[15px] md:text-[16px] text-zinc-600 leading-[1.7] mt-5 max-w-[520px]">
              Bogura থেকে শুরু, Dhaka BDIX এ হোস্টেড। ৫০০+ SME এর ভিডিও, হোস্টিং, চ্যাট এক জায়গায়।
            </p>
            <div className="flex flex-wrap gap-3 mt-7">
              <Link href="/pricing" className="bangla px-5 h-11 rounded-full bg-[#0E7C3A] text-white text-[14px] font-semibold flex items-center hover:bg-[#0c6a32] transition">
                প্ল্যান দেখুন
              </Link>
              <Link href="/features" className="bangla px-5 h-11 rounded-full border border-zinc-200 text-[14px] font-semibold flex items-center hover:bg-zinc-50 transition">
                সব ফিচার →
              </Link>
            </div>
          </div>

          {/* Founder card */}
          <div className="rounded-[28px] bg-white border border-zinc-200 p-7 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-[#0E7C3A] text-white text-2xl font-bold flex items-center justify-center">R</div>
              <div>
                <div className="bangla font-semibold text-[17px]">Romel Raisul</div>
                <div className="bangla text-[13px] text-zinc-500">Founder & CEO, Hostamar</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-6">
              {FOUNDER_STATS.map((s) => (
                <div key={s.v} className="rounded-2xl bg-zinc-50 border border-zinc-100 p-3 text-center">
                  <div className="text-[20px] font-bold tracking-tight">{s.k}</div>
                  <div className="bangla text-[11px] text-zinc-500 mt-0.5">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Story timeline */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 py-12">
        <h2 className="bangla text-[26px] md:text-[30px] font-bold mb-8">আমাদের গল্প</h2>
        <div className="relative pl-6 border-l-2 border-zinc-200">
          {TIMELINE.map((t) => (
            <div key={t.year} className="relative mb-8 last:mb-0">
              <div className="absolute -left-[31px] top-1.5 h-4 w-4 rounded-full bg-[#0E7C3A] border-4 border-[#FCFCF9]" />
              <div className="bangla text-[13px] font-semibold text-[#0E7C3A]">{t.year}</div>
              <div className="bangla font-semibold text-[17px] mt-0.5">{t.title}</div>
              <p className="bangla text-[14px] text-zinc-600 leading-[1.6] mt-1 max-w-[560px]">{t.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 py-12">
        <h2 className="bangla text-[26px] md:text-[30px] font-bold mb-8">আমাদের ৩টি নীতি</h2>
        <div className="grid md:grid-cols-3 gap-5">
          {VALUES.map((v) => {
            const Icon = v.icon
            return (
              <div key={v.title} className="rounded-[22px] bg-white border border-zinc-200 p-6">
                <div className="h-12 w-12 rounded-xl bg-[#0E7C3A]/10 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-[#0E7C3A]" />
                </div>
                <h3 className="bangla font-semibold text-[18px]">{v.title}</h3>
                <p className="bangla text-[14px] text-zinc-600 leading-[1.6] mt-2">{v.body}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* What we build */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 py-12">
        <h2 className="bangla text-[26px] md:text-[30px] font-bold mb-2">আমরা কী বানাই</h2>
        <p className="bangla text-[14px] text-zinc-500 mb-8">শুধু কী নয় — কেন বানাই, তাও।</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PRODUCTS.map((p) => {
            const Icon = p.icon
            return (
              <div key={p.name} className="rounded-[22px] bg-white border border-zinc-200 p-6 hover:border-[#0E7C3A]/40 transition">
                <div className="h-11 w-11 rounded-xl bg-zinc-100 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-zinc-700" />
                </div>
                <h3 className="bangla font-semibold text-[17px]">{p.name}</h3>
                <p className="bangla text-[13.5px] text-zinc-600 leading-[1.6] mt-1.5">{p.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Numbers dark card */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 py-12">
        <div className="rounded-[28px] bg-zinc-900 text-white p-8 md:p-10">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 text-center">
            {NUMBERS.map((n) => (
              <div key={n.v}>
                <div className="text-[26px] md:text-[30px] font-bold tracking-tight">{n.k}</div>
                <div className="bangla text-[12.5px] text-zinc-400 mt-1">{n.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 py-12">
        <h2 className="bangla text-[26px] md:text-[30px] font-bold mb-2">ছোট কিন্তু আসল টিম</h2>
        <p className="bangla text-[14px] text-zinc-500 mb-8">ফেইক US স্টার্টআপ নয় — বগুড়া থেকে কাজ করা আসল মানুষ।</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {TEAM.map((m) => (
            <div key={m.role} className="rounded-[22px] bg-white border border-zinc-200 p-6">
              <div className="h-11 w-11 rounded-full bg-[#0E7C3A]/10 flex items-center justify-center mb-4">
                <Users className="w-5 h-5 text-[#0E7C3A]" />
              </div>
              <div className="bangla font-semibold text-[16px]">{m.role}</div>
              <div className="bangla text-[13px] text-zinc-500 mt-1">{m.note}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 inline-flex items-center gap-2 text-[13px] font-semibold text-[#0E7C3A] bg-[#0E7C3A]/10 px-4 py-2 rounded-full">
          🇧🇩 Made in Bangladesh
        </div>
      </section>

      {/* Why Bangladesh */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 py-12">
        <div className="rounded-[28px] bg-[#0E7C3A] text-white p-8 md:p-12">
          <div className="flex items-start gap-3">
            <Quote className="w-8 h-8 shrink-0 opacity-80" />
            <div>
              <p className="bangla text-[20px] md:text-[24px] font-semibold leading-[1.5]">
                আগে ২ দিনে ভিডিও বানাতাম, এখন ১০ মিনিটে।
              </p>
              <p className="bangla text-[14px] opacity-80 mt-3">— বগুড়ার এক দোকানদার, Hostamar ব্যবহারকারী</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mt-8 text-[14px]">
            <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Bogura HQ — সব সাপোর্ট এখান থেকে</div>
            <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Dhaka BDIX — ২০ms লোকাল স্পিড</div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 py-14 text-center">
        <h2 className="bangla text-[24px] md:text-[28px] font-bold">আপনার ব্যবসাও আমাদের মতো বাংলাদেশের হোক</h2>
        <Link href="/signup" className="bangla inline-block mt-5 px-6 h-12 rounded-full bg-[#0E7C3A] text-white text-[15px] font-semibold items-center hover:bg-[#0c6a32] transition">
          ফ্রি দিয়ে শুরু করুন
        </Link>
      </section>
    </div>
  )
}
