'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Globe, Check, ArrowUpRight, Star, ShieldCheck, Zap, Server, Database, Lock, ArrowLeft, Clock } from 'lucide-react'

// Grounded in repo: app/dashboard/hosting/page.tsx (canonical 5 compare rows,
// 3 plans Free ৳0/5GB · Starter ৳800/10GB · Business ৳2000/50GB NVMe, migration
// steps, crossSell), app/contact (12-min support), app/pricing (yearly 20% off
// pattern). Business=৳2000 from current hosting page + canonical 50GB. Yearly
// 20%: Starter 640, Business 1600. SKIPPED preview's fabricated testimonial.

const COMPARE = [
  { f: 'bKash Auto Payment', ex: 'Manual', h: 'Auto ✓' },
  { f: 'Bangla Panel', ex: 'No', h: 'Yes ✓' },
  { f: 'Node.js Support', ex: 'Limited', h: 'Full ✓' },
  { f: 'NVMe SSD', ex: 'No', h: 'Yes ✓' },
  { f: 'Dhaka CDN', ex: 'No', h: 'Yes 20ms ✓' },
  { f: 'Free SSL', ex: 'Paid', h: 'Free ✓' },
  { f: 'Daily Backup', ex: 'Paid', h: 'Free ✓' },
  { f: 'Support', ex: '24h', h: '12 min ✓' },
  { f: 'Price', ex: '৳800', h: '৳0–৳2000 bundle ✓' },
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
  { n: '1', t: 'ডোমেইন দিন', d: 'পুরানো প্যানেলের লগিন শেয়ার করুন (নিরাপদ)' },
  { n: '2', t: 'আমরা কপি করি', d: 'ফাইল + DB + ডোমেইন, জিরো ডাউনটাইম' },
  { n: '3', t: 'Live', d: '৩০ মিনিটে ExonHost/HosTseba থেকে ফ্রি মাইগ্রেশন' },
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
  name: 'Hostamar Web Hosting',
  areaServed: 'BD',
  provider: { '@type': 'Organization', name: 'Hostamar', url: 'https://hostamar.com' },
  offers: [
    { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'BDT', url: 'https://hostamar.com/hosting' },
    { '@type': 'Offer', name: 'Starter', price: '800', priceCurrency: 'BDT', url: 'https://hostamar.com/hosting' },
    { '@type': 'Offer', name: 'Business', price: '2000', priceCurrency: 'BDT', url: 'https://hostamar.com/hosting' },
  ],
  aggregateOffer: { '@type': 'AggregateOffer', lowPrice: '0', highPrice: '2000', priceCurrency: 'BDT', offerCount: 3 },
}

export default function HostingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [yearly, setYearly] = useState(false)
  const starter = yearly ? 640 : 800
  const business = yearly ? 1600 : 2000

  return (
    <div className="min-h-screen bg-[#FCFCF9] text-zinc-900 antialiased">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(hostingLd) }} />

      <div className="mx-auto max-w-[1180px] px-4 md:px-6 py-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-zinc-500 hover:text-zinc-800 transition">
          <ArrowLeft className="w-4 h-4" /> হোমে ফিরুন
        </Link>
      </div>

      <div className="w-full bg-zinc-900 text-zinc-100 text-[13px]">
        <div className="mx-auto max-w-[1180px] px-6 h-9 flex items-center justify-between">
          <span>5GB Free • BDIX • 99.9% SLA</span>
          <span>bKash • Nagad • Rocket</span>
        </div>
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-[1180px] px-6 py-16 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <div className="inline-flex border px-3 py-1 rounded-full text-xs">cPanel ছাড়া আধুনিক</div>
          <h1 className="mt-4 text-4xl md:text-5xl font-bold leading-tight">
            cPanel ছাড়া আধুনিক হোস্টিং, <span className="text-[#0E7C3A]">bKash দিয়ে পেমেন্ট</span>
          </h1>
          <p className="mt-4 opacity-70 leading-relaxed">
            ঢাকা CDN, NVMe SSD, ৯৯.৯% আপটাইম, বাংলা কন্ট্রোল প্যানেল। ExonHost এর পুরানো cPanel এর বদলে Vercel এর মতো অভিজ্ঞতা।
          </p>
          <div className="mt-6 flex gap-3">
            <a href="https://hostamar.com/generate" className="h-11 px-6 rounded-full bg-[#0E7C3A] text-white inline-flex items-center">Deploy Now →</a>
            <a href="#migrate" className="h-11 px-6 rounded-full border inline-flex items-center">Migration</a>
          </div>
        </div>
        {/* Dashboard mock */}
        <div className="rounded-2xl bg-zinc-900 text-white p-6 shadow-2xl">
          <div className="text-xs opacity-60">hostamar.com control panel</div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="bg-white/10 rounded-xl p-3">
              <div className="text-2xl font-bold">5GB</div>
              <div className="text-xs opacity-60">Free</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <div className="text-2xl font-bold text-[#0E7C3A]">99.9%</div>
              <div className="text-xs opacity-60">Uptime ●</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <div className="text-2xl font-bold">20ms</div>
              <div className="text-xs opacity-60">BD Ping</div>
            </div>
          </div>
          <div className="mt-4 bg-white text-zinc-900 rounded-xl p-4">
            <div className="flex justify-between text-sm">
              <span>✓ WordPress</span>
              <span>✓ Node.js</span>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span>✓ Free SSL</span>
              <span>✓ Daily Backup</span>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section id="compare" className="mx-auto max-w-[1180px] px-6 py-12">
        <h2 className="text-2xl font-bold">ExonHost vs Hostamar</h2>
        <div className="mt-6 overflow-x-auto border rounded-2xl">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="p-3 text-left">Feature</th>
                <th className="p-3">ExonHost</th>
                <th className="p-3 bg-[#0E7C3A]/10">Hostamar</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((r) => (
                <tr key={r.f} className="border-t">
                  <td className="p-3">{r.f}</td>
                  <td className="p-3 text-center text-zinc-400">{r.ex}</td>
                  <td className="p-3 text-center font-semibold text-[#0E7C3A]">{r.h}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Bento */}
      <section className="mx-auto max-w-[1180px] px-6 py-12 grid md:grid-cols-3 gap-4">
        {BENTO.map((b) => {
          const Icon = b.icon
          return (
            <div key={b.t} className="rounded-2xl border p-6">
              <Icon className="h-5 w-5 text-[#0E7C3A]" />
              <h3 className="mt-3 font-semibold">{b.t}</h3>
              <p className="text-sm opacity-60 mt-1">{b.d}</p>
            </div>
          )
        })}
      </section>

      {/* Migration */}
      <section id="migrate" className="mx-auto max-w-[1180px] px-6 py-12">
        <div className="rounded-2xl bg-zinc-900 text-white p-8">
          <h2 className="text-3xl font-bold text-center">ExonHost থেকে ফ্রি মাইগ্রেশন ৩০ মিনিটে</h2>
          <div className="mt-6 grid md:grid-cols-3 gap-4">
            {MIGRATE.map((m) => (
              <div key={m.n} className="bg-white/5 rounded-xl p-4">
                <div className="w-7 h-7 rounded-full bg-[#0E7C3A] grid place-items-center text-sm font-bold">{m.n}</div>
                <div className="mt-2 font-semibold">{m.t}</div>
                <div className="text-sm opacity-70 mt-1">{m.d}</div>
              </div>
            ))}
          </div>
          <div className="text-center mt-6">
            <a href="https://hostamar.com/generate" className="inline-flex h-11 px-6 rounded-full bg-white text-zinc-900 font-semibold items-center">মাইগ্রেশন শুরু করুন</a>
          </div>
        </div>
      </section>

      {/* Pricing + yearly toggle */}
      <section className="mx-auto max-w-[1180px] px-6 py-12">
        <div className="flex items-center justify-center gap-3 mb-6">
          <button onClick={() => setYearly(false)} className={`h-9 px-4 rounded-full text-[13px] font-medium transition ${!yearly ? 'bg-zinc-900 text-white' : 'border text-zinc-600'}`}>মাসিক</button>
          <button onClick={() => setYearly(true)} className={`h-9 px-4 rounded-full text-[13px] font-medium transition flex items-center gap-1.5 ${yearly ? 'bg-zinc-900 text-white' : 'border text-zinc-600'}`}>
            বার্ষিক <span className="px-1.5 py-0.5 rounded-full bg-[#E4312B] text-white text-[10px]">২০% ছাড়</span>
          </button>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="border rounded-2xl p-6">
            <h3 className="font-bold">Free</h3>
            <div className="text-3xl font-bold mt-2">৳0</div>
            <ul className="mt-4 text-sm space-y-2 opacity-70">
              <li>✓ 5GB NVMe</li>
              <li>✓ 1 Website</li>
              <li>✓ Free SSL</li>
            </ul>
          </div>
          <div className="border-2 border-[#0E7C3A] rounded-2xl p-6 bg-[#0E7C3A]/5">
            <div className="text-xs bg-[#0E7C3A] text-white px-2 py-1 rounded-full inline">Popular</div>
            <h3 className="font-bold mt-2">Starter</h3>
            <div className="text-3xl font-bold mt-2">৳{starter}<span className="text-sm font-normal">/mo</span></div>
            <ul className="mt-4 text-sm space-y-2">
              <li>✓ 10GB NVMe</li>
              <li>✓ 10 Websites</li>
              <li>✓ bKash Auto</li>
              <li>✓ Daily Backup</li>
            </ul>
          </div>
          <div className="border rounded-2xl p-6">
            <h3 className="font-bold">Business</h3>
            <div className="text-3xl font-bold mt-2">৳{business}</div>
            <p className="text-xs mt-2 opacity-60">Video Business কিনলে Hosting Free</p>
            <ul className="mt-4 text-sm space-y-2 opacity-70">
              <li>✓ 50GB NVMe</li>
              <li>✓ Unlimited</li>
              <li>✓ 4K + API</li>
              <li>✓ Team 5</li>
            </ul>
          </div>
        </div>
        <p className="text-center text-sm opacity-60 mt-4 flex items-center justify-center gap-1.5">
          <Clock className="w-3.5 h-3.5" /> একটি সাবস্ক্রিপশনে সব ৬টি প্রোডাক্ট — Video + Hosting + Gaming।
        </p>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-[1180px] px-6 py-12">
        <h2 className="text-2xl font-bold mb-5">প্রশ্ন ও উত্তর</h2>
        <div className="space-y-3">
          {FAQ.map((f, i) => (
            <div key={f.q} className="rounded-2xl border p-4">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex items-center justify-between w-full text-left font-semibold">
                {f.q}
                <span className="text-[#0E7C3A]">{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && <p className="text-sm opacity-70 mt-2 leading-relaxed">{f.a}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
