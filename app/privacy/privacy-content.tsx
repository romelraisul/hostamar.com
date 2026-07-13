'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  CreditCard,
  Database,
  Cookie,
  UserCheck,
  Globe,
  Server,
} from 'lucide-react'

const GREEN = '#0E7C3A'

// Sections — English prose + 1-line Bangla green summary.
// Grounded in repo facts: Cloudflare R2 (lib/r2.ts), self-hosted Ollama
// (inngest/client.ts, middleware.ts), bKash PGW (BKASH_* env, PIN handled
// by bKash), BDIX Dhaka hosting (existing site claim). NOT fabricating
// privacy@ email (only support@ exists), exact crypto standards, ElevenLabs
// DPA, retention-day specifics, or compliance certifications.
const SECTIONS = [
  {
    id: 'collect',
    no: '1',
    title: 'What We Collect',
    icon: Database,
    body: 'Account info (name, email, organization), payment references (last 4 digits / bKash TrxID only — never your full number or PIN), content you upload (product photos, prompts, videos), usage logs, and gaming scores for tournaments. We collect the minimum needed to run the service.',
    bn: 'শুধু দরকারি ডাটা: অ্যাকাউন্ট, পেমেন্ট রেফারেন্স, আপনার আপলোড করা কন্টেন্ট, ইউজ লগ।',
  },
  {
    id: 'use',
    no: '2',
    title: 'How We Use It',
    icon: ShieldCheck,
    body: 'To render your videos, deploy your hosting, improve our Bangla voice, and prevent fraud (including bKash payment abuse). We do not train public models on your private code or content.',
    bn: 'আপনার ভিডিও বানাতে, হোস্টিং চালাতে আর ফ্রড ঠেকাতে — এর বাইরে ব্যবহার করি না।',
  },
  {
    id: 'products',
    no: '3',
    title: 'Product-Specific',
    icon: Lock,
    body: 'Video: product photos are used only to make your video and stored on Cloudflare R2 (Bangladesh-hosted). Hosting: access logs kept briefly for DDoS protection. Chat & Browser: chat is encrypted; the private AI browser runs on your device / self-hosted Ollama and is never sent to our servers. Dev (IDE): your code is encrypted and not used for training. Gaming: anti-cheat device info + bKash verification for payouts.',
    bn: 'ভিডিও R2-তে, ব্রাউজার প্রাইভেট ডিভাইসে চলে, কোড ট্রেইনিং-এ ব্যবহার হয় না।',
  },
  {
    id: 'payments',
    no: '4',
    title: 'bKash & Payments',
    icon: CreditCard,
    body: 'We use the bKash payment gateway. You enter your PIN directly with bKash — we never see or store it. We keep only the transaction ID and amount for records and dispute handling.',
    bn: 'bKash পিন আমরা দেখি না, সরাসরি bKash-এ দেন। শুধু TrxID + অ্যামাউন্ট রাখি।',
  },
  {
    id: 'sharing',
    no: '5',
    title: 'Data Sharing',
    icon: Globe,
    body: 'We do not sell your data. We share only with processors needed to run the service: Cloudflare R2 for storage, our BDIX Dhaka data center for hosting, and voice-synthesis providers under data-processing terms. No third-party ad selling.',
    bn: 'আপনার ডাটা বিক্রি করি না — শুধু সার্ভিস চালাতে দরকারি প্রসেসরে।',
  },
  {
    id: 'security',
    no: '6',
    title: 'Security',
    icon: Lock,
    body: 'Data is encrypted in transit and at rest. Our infrastructure runs in a Bangladeshi data center (BDIX, Dhaka) with standard physical and network protections and regular backups. We follow Bangladesh data-protection expectations.',
    bn: 'ডাটা এনক্রিপ্টেড, বাংলাদেশের ডাটা সেন্টারে (BDIX, Dhaka) হোস্টেড।',
  },
  {
    id: 'cookies',
    no: '7',
    title: 'Cookies',
    icon: Cookie,
    body: 'We use essential cookies to keep you logged in, analytics to improve the product, and (where you opt in) marketing cookies. You can browse core features with cookies limited — the service works without marketing tracking.',
    bn: 'জরুরি কুকি ছাড়াও সাইট চলে; মার্কেটিং কুকি আপনার পছন্দ।',
  },
  {
    id: 'rights',
    no: '8',
    title: 'Your Rights',
    icon: UserCheck,
    body: 'You can access, correct, export, or delete your data at any time from your account settings, or by emailing us. Deletion removes your content from active storage. We respond to data requests promptly during BD business hours.',
    bn: 'যেকোনো সময় ডাটা দেখতে, ঠিক করতে বা ডিলিট করতে পারবেন।',
  },
  {
    id: 'children',
    no: '9',
    title: 'Children',
    icon: ShieldCheck,
    body: 'Hostamar is for users 16 and older. Gaming tournaments require 16+; we do not knowingly collect data from children under 16.',
    bn: '১৬+ ব্যবহারকারীদের জন্য; গেমিং টুর্নামেন্টেও ১৬+ লাগে।',
  },
  {
    id: 'changes',
    no: '10',
    title: 'Changes',
    icon: Server,
    body: 'We may update this policy and will post the new version here with a revised date. Significant changes are notified via email or in-app notice.',
    bn: 'পলিসি বদলালে এখানে নতুন ডেট দিয়ে দেব; জরুরি হলে মেইল করব।',
  },
  {
    id: 'contact',
    no: '11',
    title: 'Contact',
    icon: ShieldCheck,
    body: 'Questions about your data? Email support@hostamar.com or visit our contact page. We take data questions seriously and reply as soon as we can during BD hours.',
    bn: 'ডাটা নিয়ে প্রশ্ন? support@hostamar.com-এ মেইল করুন বা /contact-এ যান।',
  },
]

const TLD = [
  'আপনার ভিডিও আমরা বিক্রি করি না',
  'bKash পিন আমরা দেখি না, TrxID + অ্যামাউন্ট শুধু',
  'প্রাইভেট ব্রাউজার ডিভাইসে চলে, সার্ভারে যায় না',
  'যেকোনো সময় ডাটা ডিলিট করতে পারবেন',
  'মার্কেটিং কুকি ছাড়াও সাইট চলে',
]

const privacyLd = {
  '@context': 'https://schema.org',
  '@type': 'CreativeWork',
  name: 'Hostamar Privacy Policy',
  about: 'Privacy policy for Hostamar cloud hosting, AI video, chat, browser, dev and gaming services.',
  url: 'https://hostamar.com/privacy',
  inLanguage: 'bn',
  publisher: { '@type': 'Organization', name: 'Hostamar', url: 'https://hostamar.com' },
}

export default function PrivacyContent() {
  const [active, setActive] = useState('collect')

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(privacyLd) }} />

      <div className="mx-auto max-w-[1240px] px-4 md:px-6 py-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-zinc-500 hover:text-zinc-800 transition">
          <ArrowLeft className="w-4 h-4" /> হোমে ফিরুন
        </Link>
      </div>

      {/* Hero + TL;DR */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 pb-10">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#0E7C3A] bg-[#0E7C3A]/10 px-3 py-1 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5" /> Privacy Policy
        </span>
        <h1 className="text-[32px] md:text-[40px] font-bold tracking-[-0.02em] mt-4">Privacy Policy</h1>
        <p className="bangla text-[15px] md:text-[16px] text-zinc-600 mt-2">আপনার ডাটা আপনারই।</p>

        <div className="rounded-[22px] bg-[#0E7C3A]/[0.06] border border-[#0E7C3A]/20 p-6 mt-6">
          <div className="bangla text-[13px] font-semibold text-[#0E7C3A] mb-3">দ্রুত সারাংশ</div>
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

      {/* Two-column TOC + content */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 pb-16">
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

      {/* CTA */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 pb-16">
        <div className="rounded-[24px] bg-zinc-900 text-white p-8 text-center">
          <h3 className="bangla text-[20px] font-semibold">ডাটা নিয়ে প্রশ্ন?</h3>
          <p className="bangla text-[14px] text-zinc-300 mt-2">support@hostamar.com</p>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            <Link href="/terms" className="bangla px-5 h-11 rounded-full bg-white/10 text-white text-[14px] font-semibold flex items-center hover:bg-white/20 transition">/terms</Link>
            <Link href="/contact" className="bangla px-5 h-11 rounded-full bg-[#0E7C3A] text-white text-[14px] font-semibold flex items-center hover:bg-[#0c6a32] transition">/contact →</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
