'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLocale } from '@/lib/locale-context'

// /hosting — marketing lander (design system: #FCFCF9 / #0E7C3A / #E4312B).
// Seeded from the user's production HTML (Hosting-পেজ-দেখো.html) but rebuilt in
// Next.js using the home design tokens so brand stays consistent. The old
// server-management dashboard now lives at /dashboard/hosting.

const CONTENT = {
  bn: {
    badge: 'বাংলাদেশি কোম্পানি',
    nav: ['ফিচার', 'কম্পারিজন', 'মাইগ্রেশন', 'প্রাইসিং'],
    cta: 'হোস্টিং শুরু করুন',
    heroEyebrow: 'cPanel ছাড়া আধুনিক হোস্টিং',
    heroTitle: 'bKash দিয়ে পেমেন্ট, ঢাকা CDN, NVMe SSD',
    heroSub: 'তুমি শুধু ব্যবসা করো — সার্ভারের ঝামেলা আমরা সামলাই। বাংলা কন্ট্রোল প্যানেল, এক-ক্লিক WordPress, ফ্রি SSL।',
    points: ['৫GB ফ্রি', '৯৯.৯% Uptime SLA', '২৪/৭ বাংলা সাপোর্ট'],
    compareTitle: 'অন্যরা vs Hostamar',
    compareCols: ['ফিচার', 'ExonHost', 'Hostamar'],
    rows: [
      ['bKash অটো পেমেন্ট', '✗', '✓'],
      ['বাংলা কন্ট্রোল প্যানেল', '✗', '✓'],
      ['Node / Python সাপোর্ট', 'সীমিত', '✓'],
      ['ঢাকা CDN (PoP)', '✗', '✓'],
      ['ফ্রি মাইগ্রেশন', '✗', '✓'],
    ],
    bentoTitle: 'সবকিছু বাক্সে বন্দী',
    bento: [
      ['WordPress 1-ক্লিক', 'এক ক্লিকে ইনস্টল, সব আপডেট অটো'],
      ['ফ্রি SSL', 'সব ডোমেইনে স্বয়ংক্রিয় Let\'s Encrypt'],
      ['ডেইলি ব্যাকআপ', 'রাতে অটো ব্যাকআপ, যেকোনো দিন রিস্টোর'],
      ['NVMe স্টোরেজ', 'SSD-এর চেয়ে ৬× দ্রুত I/O'],
    ],
    migrateTitle: 'ExonHost থেকে ফ্রি মাইগ্রেশন — ৩০ মিনিটে',
    steps: [
      ['অর্ডার করুন', 'ফ্রি ৫GB প্ল্যান বা Starter সিলেক্ট করুন'],
      ['এক্সেস দিন', 'পুরানো প্যানেলের লগিন শেয়ার করুন (নিরাপদ)'],
      ['আমরা মুভ করি', 'ফাইল + DB + ডোমেইন, জিরো ডাউনটাইম'],
    ],
    pricingTitle: 'সহজ প্রাইসিং',
    plans: [
      ['Free', '৳0', '৫GB', ['৫GB NVMe', 'ফ্রি SSL', 'bKash পেমেন্ট', 'বাংলা প্যানেল']],
      ['Starter', '৳800', '১০GB', ['১০GB NVMe', 'WordPress 1-ক্লিক', 'ডেইলি ব্যাকআপ', 'ঢাকা CDN']],
      ['Business', '৳2000', '৫০GB', ['৫০GB NVMe', 'মাল্টি-সাইট', 'প্রায়োরিটি সাপোর্ট', 'কাস্টম ডোমেইন']],
    ],
    crossSell: 'Video Business কিনলে হোস্টিং ফ্রি — এক সাবস্ক্রিপশনে সব।',
    faqTitle: 'সাধারণ প্রশ্ন',
    faq: [
      ['bKash দিয়ে কিভাবে পেমেন্ট করব?', 'চেকআউটে bKash সিলেক্ট করুন — অটো রিডিরেক্ট, মোবাইলে পেমেন্ট।'],
      ['মাইগ্রেশন ফ্রি?', 'হ্যাঁ, ExonHost/HosTseba থেকে ফ্রি ফুল মাইগ্রেশন (৩০ মিনিট)।'],
      ['কি কি ল্যাঙ্গুয়েজ সাপোর্ট?', 'Node, Python, PHP, Docker — সব রান করে।'],
    ],
  },
  en: {
    badge: 'Bangladeshi company',
    nav: ['Features', 'Compare', 'Migrate', 'Pricing'],
    cta: 'Start hosting',
    heroEyebrow: 'Modern hosting, no cPanel',
    heroTitle: 'bKash payments, Dhaka CDN, NVMe SSD',
    heroSub: 'You run the business — we handle the servers. Bangla control panel, 1-click WordPress, free SSL.',
    points: ['5GB free', '99.9% Uptime SLA', '24/7 Bangla support'],
    compareTitle: 'Others vs Hostamar',
    compareCols: ['Feature', 'ExonHost', 'Hostamar'],
    rows: [
      ['bKash auto-payment', '✗', '✓'],
      ['Bangla control panel', '✗', '✓'],
      ['Node / Python support', 'Limited', '✓'],
      ['Dhaka CDN (PoP)', '✗', '✓'],
      ['Free migration', '✗', '✓'],
    ],
    bentoTitle: 'Everything in the box',
    bento: [
      ['WordPress 1-click', 'Install in one click, auto updates'],
      ['Free SSL', 'Automatic Let\'s Encrypt on every domain'],
      ['Daily backup', 'Nightly auto backup, restore any day'],
      ['NVMe storage', '6× faster I/O than SSD'],
    ],
    migrateTitle: 'Free migration from ExonHost — in 30 minutes',
    steps: [
      ['Order', 'Pick the free 5GB plan or Starter'],
      ['Grant access', 'Securely share old panel login'],
      ['We move it', 'Files + DB + domain, zero downtime'],
    ],
    pricingTitle: 'Simple pricing',
    plans: [
      ['Free', '৳0', '5GB', ['5GB NVMe', 'Free SSL', 'bKash payment', 'Bangla panel']],
      ['Starter', '৳800', '10GB', ['10GB NVMe', 'WordPress 1-click', 'Daily backup', 'Dhaka CDN']],
      ['Business', '৳2000', '50GB', ['50GB NVMe', 'Multi-site', 'Priority support', 'Custom domain']],
    ],
    crossSell: 'Buy Video Business and hosting is free — one subscription for everything.',
    faqTitle: 'FAQ',
    faq: [
      ['How do I pay with bKash?', 'Select bKash at checkout — auto redirect, pay from mobile.'],
      ['Is migration free?', 'Yes, full free migration from ExonHost/Hostseba (30 min).'],
      ['What runtimes are supported?', 'Node, Python, PHP, Docker — all run.'],
    ],
  },
} as const

export default function HostingLandingPage() {
  const { locale } = useLocale()
  const c = CONTENT[locale === 'bn' ? 'bn' : 'en']
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-[#FCFCF9] text-[#18181B]">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-[#E8E6E1] bg-[#FCFCF9]/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between px-5 py-4">
          <Link href="/" className="font-hind text-xl font-bold">
            Hostamar<span className="text-[#0E7C3A]">.</span>
          </Link>
          <div className="hidden items-center gap-7 text-sm font-medium text-zinc-600 md:flex">
            {c.nav.map((n) => (
              <a key={n} href={`#${n.toLowerCase()}`} className="transition hover:text-[#18181B]">
                {n}
              </a>
            ))}
          </div>
          <Link
            href="/signup"
            className="rounded-full bg-[#0E7C3A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0A5A2B]"
          >
            {c.cta}
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-[1120px] px-5 pt-16 pb-10 text-center">
        <span className="inline-block rounded-full bg-[#0E7C3A]/10 px-3 py-1 text-sm font-semibold text-[#0E7C3A]">
          {c.heroEyebrow}
        </span>
        <h1 className="mx-auto mt-4 max-w-3xl font-hind text-4xl font-bold leading-tight md:text-5xl">
          {c.heroTitle}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-zinc-600">{c.heroSub}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {c.points.map((p) => (
            <span key={p} className="rounded-full border border-[#E8E6E1] bg-white px-3 py-1 text-xs font-medium text-zinc-700">
              {p}
            </span>
          ))}
        </div>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-full bg-[#0E7C3A] px-6 py-3 font-semibold text-white transition hover:bg-[#0A5A2B]"
          >
            {c.cta}
          </Link>
          <Link
            href="#compare"
            className="rounded-full border border-zinc-300 px-6 py-3 font-semibold text-zinc-700 transition hover:bg-zinc-100"
          >
            {c.nav[1]}
          </Link>
        </div>
      </section>

      {/* Compare */}
      <section id="compare" className="mx-auto max-w-[1120px] px-5 py-14">
        <h2 className="mb-6 text-center font-hind text-3xl font-bold">{c.compareTitle}</h2>
        <div className="overflow-x-auto rounded-2xl border border-[#E8E6E1] bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#E8E6E1] bg-zinc-50">
                {c.compareCols.map((col) => (
                  <th key={col} className="px-5 py-3 font-semibold">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {c.rows.map((r) => (
                <tr key={r[0]} className="border-b border-zinc-100">
                  <td className="px-5 py-3 font-medium">{r[0]}</td>
                  <td className="px-5 py-3 text-zinc-400">{r[1]}</td>
                  <td className="px-5 py-3 font-semibold text-[#0E7C3A]">{r[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Bento */}
      <section className="mx-auto max-w-[1120px] px-5 py-14">
        <h2 className="mb-6 text-center font-hind text-3xl font-bold">{c.bentoTitle}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {c.bento.map((b) => (
            <div key={b[0]} className="rounded-2xl border border-[#E8E6E1] bg-white p-5">
              <h3 className="font-semibold text-[#0E7C3A]">{b[0]}</h3>
              <p className="mt-2 text-sm text-zinc-600">{b[1]}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Migration (dark) */}
      <section className="bg-[#111827] py-16">
        <div className="mx-auto max-w-[1120px] px-5">
          <h2 className="text-center font-hind text-3xl font-bold text-white">{c.migrateTitle}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {c.steps.map((s, i) => (
              <div key={s[0]} className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0E7C3A] text-sm font-bold text-white">
                  {i + 1}
                </div>
                <h3 className="mt-4 font-hind text-lg font-semibold text-white">{s[0]}</h3>
                <p className="mt-1 text-sm text-zinc-300">{s[1]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-[1120px] px-5 py-16">
        <h2 className="mb-6 text-center font-hind text-3xl font-bold">{c.pricingTitle}</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {c.plans.map((p, i) => (
            <div
              key={p[0]}
              className={`rounded-2xl border p-6 ${
                i === 1 ? 'border-[#0E7C3A] bg-[#0E7C3A]/5' : 'border-[#E8E6E1] bg-white'
              }`}
            >
              {i === 1 && (
                <span className="mb-3 inline-block rounded-full bg-[#0E7C3A] px-3 py-1 text-xs font-semibold text-white">
                  Most Popular
                </span>
              )}
              <h3 className="font-hind text-xl font-bold">{p[0]}</h3>
              <p className="mt-2 font-hind text-3xl font-bold text-[#0E7C3A]">
                {p[1]} <span className="text-sm font-normal text-zinc-500">/মাস</span>
              </p>
              <p className="text-sm text-zinc-500">{p[2]} storage</p>
              <ul className="mt-4 space-y-2 text-sm text-zinc-700">
                {(p[3] as string[]).map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="text-[#0E7C3A]">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={`mt-6 block rounded-full py-2.5 text-center text-sm font-semibold ${
                  i === 1 ? 'bg-[#0E7C3A] text-white' : 'border border-zinc-300 text-zinc-700'
                }`}
              >
                {c.cta}
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm font-medium text-[#E4312B]">{c.crossSell}</p>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-[760px] px-5 py-14">
        <h2 className="mb-6 text-center font-hind text-3xl font-bold">{c.faqTitle}</h2>
        <div className="space-y-3">
          {c.faq.map((f, i) => (
            <div key={f[0]} className="rounded-2xl border border-[#E8E6E1] bg-white">
              <button
                type="button"
                className="flex w-full items-center justify-between px-5 py-4 text-left font-semibold"
                onClick={() => setOpen(open === i ? null : i)}
              >
                {f[0]}
                <span className="text-[#0E7C3A]">{open === i ? '−' : '+'}</span>
              </button>
              {open === i && <p className="px-5 pb-4 text-sm text-zinc-600">{f[1]}</p>}
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-[#E8E6E1] py-8 text-center text-sm text-zinc-500">
        🇧🇩 Made in Bangladesh · Hostamar
      </footer>
    </div>
  )
}
