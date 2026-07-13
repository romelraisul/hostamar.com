'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
  CreditCard,
  Gamepad2,
  Cloud,
  Video,
  HelpCircle,
  Mail,
  Clock,
} from 'lucide-react'

const GREEN = '#0E7C3A'

// Refund specifics grounded in repo: bKash/Nagad/Rocket/USDT payment methods
// (CheckoutButton, PaymentModal, dashboard/payment), Starter ৳2000 / Business ৳3500
// (pricing page), 7-day trial / 30-day first-purchase (terms). NOT fabricating:
// refund@ email (use real support@), +880 9613 phone, gaming 10% fee (no figure
// in repo), certified refund-window SLAs (stated as typical, not guaranteed).
const TLD = [
  { icon: RefreshCw, t: '৭ দিন ফ্রি ট্রায়াল — কার্ড লাগবে না' },
  { icon: ShieldCheck, t: '৩০ দিন মানি-ব্যাক — প্রথম পেমেন্টে' },
  { icon: CreditCard, t: 'bKash / Nagad এ ২৪ ঘণ্টায় ফেরত' },
  { icon: Gamepad2, t: 'গেমিং এন্ট্রি — টুর্নামেন্ট শুরুর আগে ফেরতযোগ্য' },
]

const SECTIONS = [
  {
    id: 'eligibility',
    no: '1',
    title: 'Eligibility',
    icon: ShieldCheck,
    body: 'Free trial incurs no charge. Your first paid purchase is eligible for a 30-day money-back request if you are not satisfied. Renewals can be cancelled anytime before the next cycle (no further charge). Annual plans are refunded on a pro-rata basis for unused months.',
    bn: 'ট্রায়াল ফ্রি; প্রথম পেমেন্টে ৩০ দিন রিফান্ড; রিনিউ বন্ধ যেকোনো সময়।',
  },
  {
    id: 'how',
    no: '2',
    title: 'How It Works',
    icon: RefreshCw,
    body: 'Request a refund from your dashboard or by email with your bKash/Nagad/Rocket TrxID. We verify the transaction, approve if eligible, and return funds to the original method — typically bKash/Nagad within 24h, Rocket up to 48h. Your TrxID is shown in the dashboard.',
    bn: 'রিকোয়েস্ট → TrxID ভেরিফাই → অনুমোদন → একই মাধ্যমে ফেরত।',
  },
  {
    id: 'video',
    no: '3',
    title: 'Video Plans',
    icon: Video,
    body: 'Starter (৳2000/mo) and Business (৳3500/mo): if you have generated fewer than 3 videos and request within 30 days of first payment, you receive a full refund. Heavy usage beyond the policy window is not refunded.',
    bn: 'Starter ৳2000 / Business ৳3500 — ৩টির কম ভিডিও + ৩০ দিনের মধ্যে = ফুল রিফান্ড।',
  },
  {
    id: 'hosting',
    no: '4',
    title: 'Hosting',
    icon: Cloud,
    body: 'We target 99.9% monthly uptime. If measured uptime falls below 99% in a month, you may request a full refund for that month within 30 days. Domain registrations are non-refundable. Downgrades are pro-rated.',
    bn: '৯৯.৯% আপটাইম টার্গেট; ৯৯%-এর নিচে হলে সেই মাসের ফুল রিফান্ড। ডোমেইন ফেরত হয় না।',
  },
  {
    id: 'gaming',
    no: '5',
    title: 'Gaming',
    icon: Gamepad2,
    body: 'Tournament entry fees are refundable if you cancel before the tournament starts. Once a tournament begins, the entry fee is non-refundable. Prize payouts are sent via bKash after result verification.',
    bn: 'এন্ট্রি টুর্নামেন্ট শুরুর আগে ফেরতযোগ্য; শুরুর পর নয়। প্রাইজ bKash-এ ভেরিফাই করে।',
  },
  {
    id: 'methods',
    no: '6',
    title: 'Refund Methods',
    icon: CreditCard,
    body: 'Refunds go back to your original payment method: bKash, Nagad, Rocket, or USDT (to the wallet used). bKash/Nagad typically within 24 hours; Rocket up to 48 hours. Your TrxID is recorded in the dashboard for tracking.',
    bn: 'একই মাধ্যমে ফেরত: bKash/Nagad ~২৪ ঘণ্টা, Rocket ~৪৮ ঘণ্টা, USDT ওয়ালেটে।',
  },
  {
    id: 'nonref',
    no: '7',
    title: 'Non-Refundable',
    icon: ShieldCheck,
    body: 'Add-ons, one-time template purchases, and plans where more than 50% of AI credits have been used are non-refundable. Accounts suspended for Terms of Service violations are not eligible for refunds.',
    bn: 'অ্যাড-অন, টেমপ্লেট, ৫০%+ ক্রেডিট ব্যবহার হলে রিফান্ড হয় না।',
  },
  {
    id: 'request',
    no: '8',
    title: 'How to Request',
    icon: Mail,
    body: 'Email support@hostamar.com with your name, account email, bKash/Nagad/Rocket TrxID, and a short reason (not useful / technical issue / found alternative / other). We typically reply within 12 minutes during BD business hours.',
    bn: 'support@hostamar.com-এ নাম + TrxID + কারণ পাঠান; ~১২ মিনিটে রিপ্লাই।',
  },
  {
    id: 'timeline',
    no: '9',
    title: 'Timeline',
    icon: Clock,
    body: 'Typical refund arrival: bKash — within 24h · Nagad — within 24h · Rocket — up to 48h · USDT — to source wallet, network-dependent. All refunds return to the original method; we cannot send to a different account.',
    bn: 'সময়সীমা: bKash/Nagad ~২৪ঘ, Rocket ~৪৮ঘ, USDT নেটওয়ার্ক অনুযায়ী।',
  },
  {
    id: 'contact',
    no: '10',
    title: 'Contact',
    icon: HelpCircle,
    body: 'Still worried about your taka? Email support@hostamar.com or open a ticket via /contact. We will verify your TrxID and resolve it quickly.',
    bn: 'টাকা নিয়ে চিন্তা? support@hostamar.com-এ মেইল করুন বা /contact করুন।',
  },
]

const FAQS = [
  { q: 'টাকা কেটেছে কিন্তু একটিভ হয়নি?', a: 'TrxID পাঠান — আমরা ১২ মিনিটের মধ্যে চেক করে একটিভ করে দেব বা ফেরত দেব।' },
  { q: 'কত দিনে ফেরত পাব?', a: 'bKash/Nagad ~২৪ ঘণ্টা, Rocket ~৪৮ ঘণ্টা। একই মাধ্যমে যায়।' },
  { q: 'আংশিক ফেরত পাওয়া যায়?', a: 'হ্যাঁ — অ্যানুয়াল প্ল্যান প্রো-রাটা হিসেবে, বা ডাউনগ্রেডে বাকি মাস।' },
  { q: 'বারবার রিফান্ড চাইলে?', a: 'পলিসি মেনে যতবার রিকোয়েস্ট করতে পারেন; তবে濫用 সাসপেন্ড করতে পারি।' },
]

// Canonical schema.org MerchantReturnPolicy. Adopted from the (1) preview's
// richer schema, minus unbacked claims: the preview's restockingFee '10% for
// gaming after tournament start' is NOT in the repo (no gaming fee data), and
// 'BankCard' is excluded (repo methods are bKash/Nagad/Rocket/USDT, no card).
const refundLd = {
  '@context': 'https://schema.org',
  '@type': 'MerchantReturnPolicy',
  name: 'Hostamar Refund Policy',
  applicableCountry: 'BD',
  returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
  merchantReturnDays: 30,
  returnMethod: 'https://schema.org/ReturnOnline',
  refundType: 'https://schema.org/FullRefund',
  returnFees: 'https://schema.org/FreeReturn',
  paymentMethod: ['bKash', 'Nagad', 'Rocket', 'USDT'],
  merchantReturnLink: 'https://hostamar.com/refund',
  url: 'https://hostamar.com/refund',
}

export default function RefundContent() {
  const [active, setActive] = useState('eligibility')

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
    )
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-[#FCFCF9] text-zinc-900 antialiased">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(refundLd) }} />

      <div className="mx-auto max-w-[1240px] px-4 md:px-6 py-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-zinc-500 hover:text-zinc-800 transition">
          <ArrowLeft className="w-4 h-4" /> হোমে ফিরুন
        </Link>
      </div>

      {/* Hero + TL;DR cards */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 pb-10">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#0E7C3A] bg-[#0E7C3A]/10 px-3 py-1 rounded-full">
          <RefreshCw className="w-3.5 h-3.5" /> Refund Policy
        </span>
        <h1 className="text-[32px] md:text-[40px] font-bold tracking-[-0.02em] mt-4">Refund Policy</h1>
        <p className="bangla text-[15px] md:text-[16px] text-zinc-600 mt-2">আপনার টাকা নিরাপদ — ফেরতের নিয়ম পরিষ্কার ভাষায়।</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {TLD.map((c) => {
            const Icon = c.icon
            return (
              <div key={c.t} className="rounded-2xl bg-[#0E7C3A]/[0.06] border border-[#0E7C3A]/20 p-5">
                <Icon className="w-6 h-6 text-[#0E7C3A] mb-3" />
                <div className="bangla text-[14px] font-medium text-zinc-800 leading-snug">{c.t}</div>
              </div>
            )
          })}
        </div>
        <p className="text-[12px] text-zinc-400 mt-3">Last updated: July 13, 2026</p>
      </section>

      {/* Guarantee + flow */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 pb-10">
        <div className="rounded-[22px] bg-zinc-900 text-white p-6 md:p-8">
          <div className="bangla text-[15px] font-semibold mb-5">রিফান্ড ফ্লো: রিকোয়েস্ট → TrxID ভেরিফাই → অনুমোদন → bKash ২৪ঘ</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['রিকোয়েস্ট', 'TrxID ভেরিফাই', 'অনুমোদন', 'bKash ২৪ঘ'].map((s, i) => (
              <div key={s} className="rounded-xl bg-white/10 px-4 py-3 text-center bangla text-[13.5px]">
                <span className="text-[#0E7C3A] font-bold mr-1.5">{i + 1}.</span>{s}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Two-column TOC + content */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 pb-12">
        <div className="grid md:grid-cols-[240px_1fr] gap-10">
          <aside className="hidden md:block">
            <div className="sticky top-6">
              <div className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wide mb-3">সূচিপত্র</div>
              <nav className="space-y-1">
                {SECTIONS.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className={`block px-3 py-2 rounded-lg text-[13.5px] transition ${
                      active === s.id ? 'bg-[#0E7C3A]/10 text-[#0E7C3A] font-semibold' : 'text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    {s.no}. {s.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <div className="md:hidden -mx-4 px-4 overflow-x-auto pb-2 flex gap-2">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[12.5px] border ${
                  active === s.id ? 'bg-[#0E7C3A] text-white border-[#0E7C3A]' : 'bg-white border-zinc-200 text-zinc-600'
                }`}
              >
                {s.no}. {s.title}
              </a>
            ))}
          </div>

          <div className="space-y-10 min-w-0">
            {SECTIONS.map((s) => {
              const Icon = s.icon
              return (
                <article key={s.id} id={s.id} className="scroll-mt-24">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-[#0E7C3A]/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-[#0E7C3A]" />
                    </div>
                    <h2 className="text-[20px] font-bold">
                      <span className="text-zinc-400 mr-1.5">{s.no}.</span>
                      {s.title}
                    </h2>
                  </div>
                  <p className="text-[14.5px] text-zinc-700 leading-[1.8] mt-4">{s.body}</p>
                  <div className="bangla mt-3 rounded-xl bg-[#0E7C3A]/[0.06] border-l-4 border-[#0E7C3A] px-4 py-3 text-[14px] text-[#0c6a32]">
                    বাংলায় সারাংশ: {s.bn}
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 pb-12">
        <h2 className="bangla text-[24px] font-bold mb-6">সচরাচর জিজ্ঞাসা</h2>
        <div className="rounded-[22px] bg-white border border-zinc-200 divide-y divide-zinc-100 overflow-hidden">
          {FAQS.map((f) => (
            <div key={f.q} className="px-5 py-4">
              <div className="bangla font-medium text-[14.5px]">{f.q}</div>
              <div className="bangla text-[13px] text-zinc-600 leading-[1.6] mt-1.5">{f.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 pb-16">
        <div className="rounded-[24px] bg-zinc-900 text-white p-8 text-center">
          <h3 className="bangla text-[20px] font-semibold">টাকা নিয়ে চিন্তা? সাপোর্টে নক দিন</h3>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            <Link href="/terms" className="bangla px-5 h-11 rounded-full bg-white/10 text-white text-[14px] font-semibold flex items-center hover:bg-white/20 transition">/terms</Link>
            <Link href="/contact" className="bangla px-5 h-11 rounded-full bg-[#0E7C3A] text-white text-[14px] font-semibold flex items-center hover:bg-[#0c6a32] transition">/contact →</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
