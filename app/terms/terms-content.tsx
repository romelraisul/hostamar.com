'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Video,
  Cloud,
  Gamepad2,
  MessageSquare,
  Globe,
  Code2,
  ShieldCheck,
  Scale,
  Mail,
} from 'lucide-react'

const GREEN = '#0E7C3A'

// Sections — English legal prose + 1-line Bangla summary (green box).
// Claims grounded in repo: 7-day trial / 30-day refund (current terms),
// BDT + bKash/Nagad/Rocket (layout orgJsonLd), content ownership, BD law,
// support@hostamar.com (lib/email-templates.ts). Gaming fee/payout stated
// generally (no fabricated 10% figure).
const SECTIONS = [
  {
    id: 'acceptance',
    no: '1',
    title: 'Acceptance of Terms',
    icon: ShieldCheck,
    body: 'By accessing or creating an account on Hostamar.com, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, do not use the services. We may update these terms; continued use after notice constitutes acceptance.',
    bn: 'অ্যাকাউন্ট খুললে বা সাইট ব্যবহার করলে আপনি এই শর্তে রাজি — না মানলে ব্যবহার করবেন না।',
  },
  {
    id: 'services',
    no: '2',
    title: 'Services',
    icon: Video,
    body: 'Hostamar provides six connected products: (a) AI Video — generate marketing videos from product images/text; usage is subject to your plan limits; (b) Hosting — VPS on BDIX with 99.9% uptime target; (c) Gaming — bKash-backed tournaments with entry fees and payouts disclosed at entry; (d) Chat — Bangla AI assistant; (e) Browser — private AI browsing; (f) Dev — cloud IDE. We may modify or discontinue any product with notice.',
    bn: 'আমরা ৬টি সার্ভিস দিই: ভিডিও, হোস্টিং, গেমিং, চ্যাট, ব্রাউজার, Dev — প্রতিটির নিজস্ব লিমিট আছে।',
  },
  {
    id: 'accounts',
    no: '3',
    title: 'User Accounts',
    icon: ShieldCheck,
    body: 'You are responsible for keeping your credentials confidential and for all activity under your account. You must be 18+ or have guardian consent. One organization per paid subscription unless otherwise agreed. Notify us immediately of any unauthorized use.',
    bn: 'আপনার পাসওয়ার্ড আপনার দায়িত্ব; অ্যাকাউন্টের সব কাজের দায় আপনার।',
  },
  {
    id: 'billing',
    no: '4',
    title: 'Payment & Billing',
    icon: Scale,
    body: 'All prices are in Bangladeshi Taka (BDT) and include applicable VAT. We accept bKash, Nagad, and Rocket. Paid plans auto-renew; you may cancel anytime before the next cycle. Failed payments retry per our retry policy; service may pause until dues clear. Upgrades take effect immediately (pro-rated); downgrades apply at next cycle.',
    bn: 'দাম সব BDT-এ, ভ্যাট সহ। bKash / Nagad / Rocket দিয়ে পেমেন্ট — অটো-রিনিউ করে।',
  },
  {
    id: 'refunds',
    no: '5',
    title: 'Refunds',
    icon: ShieldCheck,
    body: 'We offer a 7-day free trial with no card required. The first purchase is eligible for a 30-day money-back request if you are not satisfied. Gaming tournament entry fees are non-refundable once a tournament starts. Hosting charges are pro-rated on downgrade. Refunds return to the original payment method.',
    bn: '৭ দিন ফ্রি ট্রায়াল (কার্ড লাগে না); প্রথম কেনায় ৩০ দিন মানি-ব্যাক। গেমিং এন্ট্রি রিফান্ড হয় না।',
  },
  {
    id: 'acceptable',
    no: '6',
    title: 'Acceptable Use',
    icon: ShieldCheck,
    body: 'You may not use Hostamar for unlawful activity, to deceive consumers, infringe IP, spread malware, or generate misleading financial content (e.g. fake bKash offer videos are prohibited). We may suspend accounts violating this section without refund.',
    bn: 'ভুয়া bKash অফার বা প্রতারণামূলক ভিডিও বানাতে পারবেন না — এটা নিষিদ্ধ।',
  },
  {
    id: 'ownership',
    no: '7',
    title: 'Content Ownership',
    icon: ShieldCheck,
    body: 'Your content (uploads, prompts, generated videos) remains yours. You grant Hostamar a limited license to process, render, and store it to deliver the service. AI-generated videos are licensed to you for your commercial use, subject to these terms. We may add a non-removable Hostamar watermark on free-tier outputs.',
    bn: 'আপনার কন্টেন্ট আপনারই — আমরা শুধু রেন্ডার করতে লাইসেন্স পাই।',
  },
  {
    id: 'limitation',
    no: '8',
    title: 'Limitation of Liability',
    icon: Scale,
    body: 'Hostamar is provided "as is". To the maximum extent permitted by Bangladeshi law, our total liability for any claim is limited to the amount you paid in the 3 months preceding the claim. We are not liable for indirect or consequential damages.',
    bn: 'আইন মোতাবেক আমাদের সর্বোচ্চ দায় = গত ৩ মাসের ফি।',
  },
  {
    id: 'termination',
    no: '9',
    title: 'Termination',
    icon: ShieldCheck,
    body: 'You may close your account anytime. We may suspend or terminate accounts for term violations, non-payment, or unlawful use, with notice where practicable. Upon termination, paid period access ends at cycle boundary unless refunded per policy.',
    bn: 'যেকোনো সময় অ্যাকাউন্ট বন্ধ করতে পারেন; শর্ত ভাঙলে আমরা বন্ধ করতে পারি।',
  },
  {
    id: 'contact',
    no: '10',
    title: 'Contact',
    icon: Mail,
    body: 'Questions about these terms? Email support@hostamar.com or visit our contact page. We typically reply within 12 minutes during BD business hours.',
    bn: 'প্রশ্ন? support@hostamar.com-এ মেইল করুন বা /contact-এ যান।',
  },
]

const TLD = [
  '৭ দিন ফ্রি ট্রায়াল — কার্ড লাগবে না',
  '৩০ দিন মানি-ব্যাক (প্রথম কেনা)',
  'bKash / Nagad / Rocket এ পেমেন্ট',
  'আপনার কন্টেন্ট আপনারই',
  'অবৈধ / প্রতারণার কাজ নিষিদ্ধ',
]

export default function TermsContent() {
  const [active, setActive] = useState('acceptance')

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id)
        })
      },
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
      <div className="mx-auto max-w-[1240px] px-4 md:px-6 py-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-zinc-500 hover:text-zinc-800 transition">
          <ArrowLeft className="w-4 h-4" /> হোমে ফিরুন
        </Link>
      </div>

      {/* Hero + TL;DR */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 pb-10">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#0E7C3A] bg-[#0E7C3A]/10 px-3 py-1 rounded-full">
          <Scale className="w-3.5 h-3.5" /> Terms of Service
        </span>
        <h1 className="text-[32px] md:text-[40px] font-bold tracking-[-0.02em] mt-4">Terms of Service</h1>
        <p className="bangla text-[15px] md:text-[16px] text-zinc-600 mt-2">আপনার অধিকার ও আমাদের দায়িত্ব — পরিষ্কার ভাষায়।</p>

        <div className="rounded-[22px] bg-[#0E7C3A]/[0.06] border border-[#0E7C3A]/20 p-6 mt-6">
          <div className="bangla text-[13px] font-semibold text-[#0E7C3A] mb-3">দ্রুত সারাংশ (TL;DR)</div>
          <ul className="grid sm:grid-cols-2 gap-2">
            {TLD.map((t) => (
              <li key={t} className="bangla flex items-start gap-2 text-[14px] text-zinc-700">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#0E7C3A] shrink-0" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[12px] text-zinc-400 mt-3">Last updated: July 13, 2026</p>
      </section>

      {/* Two-column: TOC + content */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 pb-16">
        <div className="grid md:grid-cols-[240px_1fr] gap-10">
          {/* Sticky TOC (desktop) */}
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

          {/* Mobile pill scroll */}
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

          {/* Sections */}
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

      {/* Bottom CTA */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 pb-16">
        <div className="rounded-[24px] bg-zinc-900 text-white p-8 text-center">
          <h3 className="bangla text-[20px] font-semibold">প্রশ্ন আছে? সাপোর্টে নক দিন</h3>
          <Link href="/contact" className="bangla inline-flex items-center gap-1.5 mt-4 px-6 h-12 rounded-full bg-[#0E7C3A] text-white text-[15px] font-semibold hover:bg-[#0c6a32] transition">
            /contact-এ যান →
          </Link>
        </div>
      </section>
    </div>
  )
}
