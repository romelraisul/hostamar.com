'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Globe, Check, Zap, Server, Database, Lock, ArrowLeft, Clock, ShieldCheck } from 'lucide-react'

const COMPARE = [
  { f: 'bKash Auto Payment', ex: 'Manual', h: 'Auto ✓' },
  { f: 'Bangla Panel', ex: 'No', h: 'Yes ✓' },
  { f: 'Node.js Support', ex: 'Limited', h: 'Full ✓' },
  { f: 'NVMe SSD', ex: 'No', h: 'Yes ✓' },
  { f: 'Dhaka CDN 20ms', ex: 'No', h: 'Yes 20ms ✓' },
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

const H1 = 'BDIX হোস্টিং - bKash অটো পেমেন্ট | 5GB ফ্রি - Hostamar'

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

export default function HostingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [yearly, setYearly] = useState(false)
  const starter = yearly ? 1600 : 2000
  const business = yearly ? 2800 : 3500

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0F172A] antialiased selection:bg-[#2563EB]/20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(hostingLd) }} />

      <div className="mx-auto max-w-[1180px] px-4 md:px-6 py-4 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-zinc-500 hover:text-zinc-800 transition">
          <ArrowLeft className="w-4 h-4" /> হোমে ফিরুন
        </Link>
        <span className="text-[11px] tracking-widest font-semibold text-white bg-[#2563EB] px-2.5 py-1 rounded-full">BDIX DHAKA • 20ms</span>
      </div>

      <div className="w-full bg-[#0F172A] text-white text-[13px]">
        <div className="mx-auto max-w-[1180px] px-4 md:px-6 h-9 flex items-center justify-between">
          <span className="font-medium">5GB Free • BDIX Dhaka PoP • 99.9% SLA • UptimeRobot</span>
          <span className="hidden sm:inline opacity-80">bKash • Nagad • Rocket — অটো পেমেন্ট</span>
        </div>
      </div>

      <section className="mx-auto max-w-[1180px] px-4 md:px-6 py-10 md:py-16 grid md:grid-cols-2 gap-8 md:gap-10 items-center">
        <div>
          <div className="inline-flex border border-[#2563EB]/20 bg-[#2563EB]/10 text-[#2563EB] px-3 py-1 rounded-full text-xs font-semibold">cPanel ছাড়া আধুনিক — BDIX</div>
          <h1 className="mt-4 text-[28px] sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight">
            cPanel ছাড়া আধুনিক হোস্টিং, <span className="text-[#2563EB]">bKash দিয়ে পেমেন্ট</span>
          </h1>
          <p className="mt-4 text-zinc-600 leading-relaxed text-[15px]">
            ঢাকা CDN 20ms, NVMe SSD, ৯৯.৯% আপটাইম, বাংলা কন্ট্রোল প্যানেল। ExonHost এর পুরানো cPanel এর বদলে Vercel এর মতো অভিজ্ঞতা — ৫GB ফ্রি থেকে শুরু।
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/pricing" data-ga="pricing_click" className="h-11 px-7 rounded-full bg-[#0E7C3A] text-white inline-flex items-center font-semibold shadow-[0_10px_24px_-12px_#0E7C3A] hover:bg-[#0c6a32] transition">ফ্রিতে শুরু করুন ৳0 →</Link>
            <a href="#compare" className="h-11 px-6 rounded-full border border-zinc-200 bg-white text-zinc-800 inline-flex items-center font-medium hover:bg-zinc-50 transition">তুলনা দেখুন</a>
          </div>
          <div className="mt-6 flex flex-wrap gap-2 text-xs text-zinc-500">
            <span className="px-2.5 py-1 rounded-full border bg-white">BDIX Dhaka</span>
            <span className="px-2.5 py-1 rounded-full border bg-white">LiteSpeed + LSCache</span>
            <span className="px-2.5 py-1 rounded-full border bg-white">JetBackup 7pts</span>
          </div>
        </div>
        <div className="rounded-[24px] bg-[#0F172A] text-white p-6 shadow-2xl">
          <div className="text-xs opacity-60 tracking-wide">hostamar.com — কন্ট্রোল প্যানেল</div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="bg-white/10 rounded-2xl p-4">
              <div className="text-2xl font-bold">5GB</div>
              <div className="text-xs opacity-60">Free NVMe</div>
            </div>
            <div className="bg-white/10 rounded-2xl p-4">
              <div className="text-2xl font-bold text-[#93C5FD]">99.9%</div>
              <div className="text-xs opacity-60">Uptime ●</div>
            </div>
            <div className="bg-white/10 rounded-2xl p-4">
              <div className="text-2xl font-bold">20ms</div>
              <div className="text-xs opacity-60">BD Ping</div>
            </div>
          </div>
          <div className="mt-4 bg-white text-zinc-900 rounded-2xl p-4">
            <div className="flex justify-between text-sm font-medium">
              <span>✓ WordPress 1-click</span>
              <span>✓ Node.js</span>
            </div>
            <div className="mt-2 flex justify-between text-sm font-medium">
              <span>✓ Free SSL</span>
              <span>✓ Daily Backup</span>
            </div>
          </div>
        </div>
      </section>

      <section id="compare" className="mx-auto max-w-[1180px] px-4 md:px-6 py-8">
        <div className="rounded-[24px] border border-zinc-200 bg-white overflow-hidden">
          <div className="px-6 py-4 border-b bg-zinc-50 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">ExonHost vs Hostamar — ৳0 বান্ডেলে কী পান</h2>
            <span className="text-xs px-2.5 py-1 rounded-full bg-[#2563EB] text-white font-semibold">HostSeba ৳2220/yr No AI vs Hostamar ৳2000/yr AI সহ</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="text-left text-zinc-500 border-b">
                  <th className="p-4 font-medium">Feature</th>
                  <th className="p-4 text-center font-medium">ExonHost</th>
                  <th className="p-4 text-center font-semibold text-[#2563EB] bg-[#EFF6FF]">Hostamar</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((r) => (
                  <tr key={r.f} className="border-t">
                    <td className="p-4 font-medium">{r.f}</td>
                    <td className="p-4 text-center text-zinc-400">{r.ex}</td>
                    <td className="p-4 text-center font-semibold text-[#2563EB] bg-[#EFF6FF]/50">{r.h}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 bg-[#F8FAFC] text-xs text-zinc-500">ExonHost Starter ~৳834/mo (WHTop) • HostSeba Basic ৳831/yr প্রথম বছর — renew +30%। Hostamar — কোনো renew trap নেই।</div>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-4 md:px-6 py-8 grid md:grid-cols-3 gap-4">
        {BENTO.map((b) => {
          const Icon = b.icon
          return (
            <div key={b.t} className="rounded-2xl border border-zinc-200 bg-white p-6">
              <Icon className="h-5 w-5 text-[#2563EB]" />
              <h3 className="mt-3 font-semibold text-[15px]">{b.t}</h3>
              <p className="text-sm text-zinc-500 mt-1">{b.d}</p>
            </div>
          )
        })}
      </section>

      <section id="migrate" className="mx-auto max-w-[1180px] px-4 md:px-6 py-8">
        <div className="rounded-[24px] bg-[#0F172A] text-white p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-bold text-center">ExonHost থেকে ফ্রি মাইগ্রেশন ৩০ মিনিটে</h2>
          <p className="text-center text-sm text-white/70 mt-2">জিরো ডাউনটাইম — ফাইল + DB + ডোমেইন আমরা কপি করি</p>
          <div className="mt-6 grid md:grid-cols-3 gap-4">
            {MIGRATE.map((m) => (
              <div key={m.n} className="bg-white/10 rounded-2xl p-4 border border-white/10">
                <div className="w-7 h-7 rounded-full bg-[#2563EB] grid place-items-center text-sm font-bold">{m.n}</div>
                <div className="mt-2 font-semibold">{m.t}</div>
                <div className="text-sm opacity-70 mt-1">{m.d}</div>
              </div>
            ))}
          </div>
          <div className="text-center mt-6">
            <Link href="/pricing" data-ga="pricing_click" className="inline-flex h-11 px-7 rounded-full bg-white text-[#0F172A] font-semibold items-center">মাইগ্রেশন শুরু করুন →</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-4 md:px-6 py-10">
        <div className="flex items-center justify-center gap-3 mb-6">
          <button onClick={() => setYearly(false)} className={`h-9 px-4 rounded-full text-[13px] font-medium transition ${!yearly ? 'bg-[#0F172A] text-white' : 'border border-zinc-200 text-zinc-600 bg-white'}`}>মাসিক</button>
          <button onClick={() => setYearly(true)} className={`h-9 px-4 rounded-full text-[13px] font-medium transition flex items-center gap-1.5 ${yearly ? 'bg-[#0F172A] text-white' : 'border border-zinc-200 text-zinc-600 bg-white'}`}>
            বার্ষিক <span className="px-1.5 py-0.5 rounded-full bg-[#F59E0B] text-white text-[10px]">২০% ছাড়</span>
          </button>
        </div>
        <div className="grid md:grid-cols-3 gap-5 md:gap-6 items-start">
          <div className="border border-zinc-200 rounded-[24px] p-6 bg-white">
            <h3 className="font-bold">Free</h3>
            <div className="text-3xl font-bold mt-2">৳0</div>
            <div className="text-xs text-zinc-500 mt-1">5GB NVMe • 1 site</div>
            <ul className="mt-4 text-sm space-y-2 text-zinc-600">
              <li className="flex gap-2"><Check className="w-4 h-4 text-[#2563EB] mt-0.5" />5GB NVMe</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-[#2563EB] mt-0.5" />Free SSL</li>
              <li>1 Website</li>
            </ul>
            <Link href="/signup" className="mt-5 block text-center h-11 leading-11 rounded-full border border-zinc-200 font-semibold">ফ্রি শুরু</Link>
          </div>
          <div className="border-2 border-[#2563EB] rounded-[24px] p-6 bg-[#EFF6FF]/40 relative">
            <div className="absolute -top-3 left-6 text-xs bg-[#2563EB] text-white px-3 py-1 rounded-full font-bold">Popular</div>
            <h3 className="font-bold mt-2">Starter</h3>
            <div className="text-3xl font-bold mt-2">৳{starter}<span className="text-sm font-normal">/mo</span></div>
            <div className="text-xs text-zinc-500 mt-1">10GB NVMe • 10 sites</div>
            <ul className="mt-4 text-sm space-y-2">
              <li>✓ 10GB NVMe</li>
              <li>✓ 10 Websites</li>
              <li>✓ bKash Auto</li>
              <li>✓ Daily Backup</li>
            </ul>
            <Link href="/pricing" data-ga="bkash_click" className="mt-5 block text-center h-11 leading-11 rounded-full bg-[#2563EB] text-white font-semibold">Starter নিন →</Link>
          </div>
          <div className="border border-zinc-200 rounded-[24px] p-6 bg-white">
            <h3 className="font-bold">Business</h3>
            <div className="text-3xl font-bold mt-2">৳{business}</div>
            <p className="text-xs mt-2 text-zinc-500">50GB NVMe • Unlimited — Video Business কিনলে Hosting Free</p>
            <ul className="mt-4 text-sm space-y-2 text-zinc-600">
              <li>✓ 50GB NVMe</li>
              <li>✓ Unlimited</li>
              <li>✓ 4K + API</li>
              <li>✓ Team 5</li>
            </ul>
            <Link href="/pricing" className="mt-5 block text-center h-11 leading-11 rounded-full border border-zinc-200 font-semibold">Business দেখুন</Link>
          </div>
        </div>
        <p className="text-center text-sm text-zinc-500 mt-4 flex items-center justify-center gap-1.5">
          <Clock className="w-3.5 h-3.5" /> একটি সাবস্ক্রিপশনে সব — Video + Hosting + Chat + IDE।
        </p>
        <div className="sticky bottom-0 mt-6 bg-white/90 backdrop-blur border border-zinc-200 rounded-full p-2 flex items-center justify-between sm:hidden shadow-lg">
          <span className="px-4 text-sm font-semibold">৳0 থেকে শুরু</span>
          <Link href="/pricing" data-ga="pricing_click" className="h-9 px-5 rounded-full bg-[#2563EB] text-white text-sm font-semibold inline-flex items-center">ফ্রিতে শুরু →</Link>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-4 md:px-6 py-8">
        <h2 className="text-xl font-bold mb-4">প্রশ্ন ও উত্তর</h2>
        <div className="space-y-3">
          {FAQ.map((f, i) => (
            <div key={f.q} className="rounded-2xl border border-zinc-200 bg-white p-4">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex items-center justify-between w-full text-left font-semibold">
                {f.q}
                <span className="text-[#2563EB] ml-4">{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && <p className="text-sm text-zinc-600 mt-2 leading-relaxed">{f.a}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
