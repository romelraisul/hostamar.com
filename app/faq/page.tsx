'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Search, ChevronDown, MessageCircle, Mail, Phone, Clock, HelpCircle } from 'lucide-react'

const GREEN = '#0E7C3A'
const WHATSAPP = 'https://wa.me/8801822417463?text=হ্যাঁ,%20আমি%20সাহায্য%20চাই'
const EMAIL = 'mailto:support@hostamar.com'
const CALL = 'tel:+8809696517463'

type Faq = {
  id: string
  cat: 'billing' | 'video' | 'hosting' | 'chat' | 'gaming' | 'account'
  q: string
  a: string
  link?: { href: string; label: string }
}

const FAQS: Faq[] = [
  // Billing
  { id: 'billing-active', cat: 'billing', q: 'টাকা কেটেছে কিন্তু একাউন্ট একটিভ হয়নি?', a: 'bKash TrxID দিয়ে যাচাই করুন — সাধারণত ২-৩ মিনিটে অটো একটিভ হয়। ১০ মিনিটের বেশি হলে TrxID সহ আমাদের কাছে যোগাযোগ করুন, ২ ঘণ্টার মধ্যে রিসল্ভ করি।', link: { href: '/contact', label: 'যোগাযোগ করুন' } },
  { id: 'billing-invoice', cat: 'billing', q: 'ইনভয়েস / রশিদ পাবো?', a: 'হ্যাঁ, প্রতিটি পেমেন্টের পর ড্যাশবোর্ডে ইনভয়েস + bKash রশিদ পাবেন। ব্যবসায়িক প্রয়োজনে VAT রশিদ ইমেইল করে দিই।' },
  { id: 'billing-refund', cat: 'billing', q: '৭ দিন মানি ব্যাক পাবো?', a: 'হ্যাঁ, যেকোনো পেইড প্ল্যানে ৭ দিনের মানি-ব্যাক গ্যারান্টি। কারণ ছাড়াই bKash নাম্বারে ২৪ ঘণ্টায় রিফান্ড।', link: { href: '/pricing', label: 'প্ল্যান দেখুন' } },
  { id: 'billing-methods', cat: 'billing', q: 'bKash ছাড়া কার্ড/ব্যাংক দিয়ে দেওয়া যায়?', a: 'হ্যাঁ, Nagad ও Rocket ছাড়াও কার্ড (Visa/Mastercard) ও ব্যাংক ট্রান্সফার চলে। BD SME-এর জন্য bKash সবচেয়ে সহজ।' },
  { id: 'billing-upgrade', cat: 'billing', q: 'মাঝে প্ল্যান আপগ্রেড করলে টাকা নষ্ট?', a: 'না — আপগ্রেড করলে শুধু প্রোরাটা (অবশিষ্ট দিন) হিসাবে অল্প টাকা কাটবে, পুরো টাকা নয়।' },

  // Video
  { id: 'video-watermark', cat: 'video', q: 'ফ্রি প্ল্যানে ওয়াটারমার্ক থাকে?', a: 'হ্যাঁ, ফ্রিতে ছোট "Made with Hostamar" ওয়াটারমার্ক থাকে। Starter (৳২,০০০/মাস) থেকে ক্লিন ১০৮০p, কোনো ওয়াটারমার্ক নয়।', link: { href: '/pricing', label: 'স্টার্টার প্ল্যান' } },
  { id: 'video-yo-phola', cat: 'video', q: 'বাংলা য-ফলা ভাঙে?', a: 'না — আমাদের Perfect Bangla Font য-ফলা, উ-কার, নাকি সহ সঠিক রেন্ডার করে। পুরানো ভাঙা রেন্ডার vs নতুন ফিক্স ফিচার পেজে দেখুন।', link: { href: '/features', label: 'ফিচার দেখুন' } },
  { id: 'video-voice', cat: 'video', q: 'ভয়েসওভার কত ভাষা সাপোর্ট করে?', a: 'মূলত বাংলা (পুরুষ/মহিলা — সুমাইয়া), ইংরেজি, হিন্দি। বাংলা আমাদের সবচেয়ে ন্যাচারাল, ElevenLabs + OpenAI মডেল।' },
  { id: 'video-4k', cat: 'video', q: '৪K export পাবো?', a: 'হ্যাঁ, Business ও Enterprise প্ল্যানে ৪K (2160p) export। Starter-এ 1080p, ফ্রিতে 720p।' },
  { id: 'video-hook', cat: 'video', q: 'Hook Generator কী?', a: 'আপনার নিচের টপিক দিয়ে স্ক্রল-স্টপিং হুক বানায় — যেমন "ঈদে সবাই তাকিয়ে থাকবে"। রমজান/পূজা/সেল সব টেমপ্লেট আছে।' },

  // Hosting
  { id: 'hosting-diff', cat: 'hosting', q: 'HostSeba / ExonHost থেকে আমাদের পার্থক্য?', a: 'ওরা শুধু হোস্টিং দেয়, আমরা AI ভিডিও + হোস্টিং একসাথে ৳২,০০০-এ। প্ল্যান কিনলে হোস্টিং ফ্রি পান, ভিডিও তৈরিও করতে পারেন।', link: { href: '/hosting', label: 'হোস্টিং দেখুন' } },
  { id: 'hosting-cpanel', cat: 'hosting', q: 'cPanel আছে?', a: 'হ্যাঁ, বাংলা cPanel — ফাইল, ডেটাবেস, ইমেইল সব বাংলায়। ইংরেজি না বুঝলেও চলবে।' },
  { id: 'hosting-bdix', cat: 'hosting', q: 'BDIX স্পিড কত?', a: 'বাংলাদেশে BDIX ২০ms লেটেন্সি, NVMe SSD। BD ভিজিটরের জন্য সবচেয়ে ফাস্ট লোড।' },
  { id: 'hosting-ssl', cat: 'hosting', q: 'ফ্রি SSL পাবো?', a: 'হ্যাঁ, Let’s Encrypt ফ্রি SSL অটো-ইনস্টল। কোনো চার্জ নেই।' },
  { id: 'hosting-migrate', cat: 'hosting', q: 'অন্য থেকে মাইগ্রেশন করে দেবেন?', a: 'হ্যাঁ, ফ্রি মাইগ্রেশন — আপনার পুরানো সাইট আমরা হোস্ট করে দেই। শুধু cPanel অ্যাক্সেস দিন।', link: { href: '/contact', label: 'মাইগ্রেশন চান' } },

  // Chat / Browser / Dev
  { id: 'browser-private', cat: 'chat', q: 'Browser history কি প্রাইভেট?', a: 'হ্যাঁ, ব্রাউজারের ইতিহাস আমাদের প্রাইভেট Ollama মডেলে থাকে, কোথাও শেয়ার হয় না। আপনি মুছে দিতে পারেন।', link: { href: '/browser', label: 'ব্রাউজার' } },
  { id: 'dev-pandas', cat: 'chat', q: 'IDE তে pandas / Python চলবে?', a: 'হ্যাঁ, ব্রাউজারেই Pyodide Python — pandas, numpy চলে। উদা: `pd.read_csv("sales.csv").head()`। ইনস্টল লাগে না।', link: { href: '/ide', label: 'IDE' } },
  { id: 'chat-pdf', cat: 'chat', q: 'Chat কি PDF বুঝে?', a: 'হ্যাঁ, PDF আপলোড করুন, বাংলায় প্রশ্ন করুন — সামারি, কিওয়াই পয়েন্ট, অনুবাদ সব পাবেন।' },
  { id: 'browser-yt', cat: 'chat', q: 'YouTube ভিডিও থেকে সামারি কীভাবে?', a: 'লিংক পেস্ট করুন, ট্রান্সক্রিপ্ট এক্সট্র্যাক্ট + বাংলা সামারি পাবেন ১০ সেকেন্ডে।', link: { href: '/browser', label: 'গাইড' } },

  // Gaming
  { id: 'gaming-payout', cat: 'gaming', q: 'bKash payout কি ইনস্ট্যান্ট?', a: 'হ্যাঁ, ৯০% payout ৫ মিনিটে bKash এ যায়। ৳৫০ হলেই উইথড্র, কোনো হোল্ড নেই, শুক্রবারেও পাবেন।' },
  { id: 'gaming-cheat', cat: 'gaming', q: 'টুর্নামেন্টে চিটিং হলে কী হয়?', a: 'Anti-cheat + ম্যানুয়াল রিভিউ। প্রমাণ পেলে ব্যান + প্রাইজ মানি ভিকটিমকে ব্যাক। ফেয়ার প্লে আমাদের USP।' },
  { id: 'gaming-ping', cat: 'gaming', q: 'BD পিং কত?', a: 'ঢাকা সার্ভারে ১৫ms লো পিং। ডাউনলোড ছাড়াই HTML5 গেম, লিংকে খুললেই খেলা।' },

  // Account
  { id: 'acc-delete', cat: 'account', q: 'একাউন্ট ডিলিট করবো?', a: 'সেটিংস → একাউন্ট থেকে ডিলিট করতে পারেন। ৭ দিনের মধ্যে ফেরত আনা যায়। ডেটা পার্মানেন্ট মুছে যায়।' },
  { id: 'acc-pass', cat: 'account', q: 'পাসওয়ার্ড ভুলে গেছি?', a: 'লগইনে "Forgot password" → ইমেইলে লিংক → নতুন পাসওয়ার্ড। bKash নাম্বার দিয়েও রিসেট করা যায়।', link: { href: '/login', label: 'লগইন' } },
  { id: 'acc-devices', cat: 'account', q: 'একাধিক ডিভাইসে লগইন থাকবে?', a: 'হ্যাঁ, ফোন + ল্যাপটপ দুটোতেই চলবে। সাসপিশাস লগইনে OTP যাবে।' },
]

const CATS: { key: 'all' | Faq['cat']; label: string }[] = [
  { key: 'all', label: 'সব' },
  { key: 'billing', label: 'বিলিং ও bKash' },
  { key: 'video', label: 'ভিডিও' },
  { key: 'hosting', label: 'হোস্টিং' },
  { key: 'chat', label: 'চ্যাট • ব্রাউজার • Dev' },
  { key: 'gaming', label: 'গেমিং' },
  { key: 'account', label: 'একাউন্ট' },
]

export default function FaqPage() {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<'all' | Faq['cat']>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return FAQS.filter((f) => {
      const catOk = cat === 'all' || f.cat === cat
      const qOk = !q || f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)
      return catOk && qOk
    })
  }, [query, cat])

  // `/` shortcut focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !/input|textarea/i.test((e.target as HTMLElement)?.tagName || '')) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // live filter opens first result
  useEffect(() => {
    setOpenId(filtered.length ? filtered[0].id : null)
  }, [filtered])

  const jsonLd = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }), [])

  return (
    <div className="min-h-screen bg-[#FCFCF9] text-zinc-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* trust banner */}
      <div className="w-full bg-[#0E7C3A] text-white text-[12px] md:text-[13px] leading-none">
        <div className="mx-auto max-w-[1180px] px-4 md:px-6 h-9 flex items-center justify-between gap-2">
          <div className="flex items-center gap-4 md:gap-6 font-medium">
            <span className="flex items-center gap-1.5"><HelpCircle className="w-3.5 h-3.5 opacity-90" /> ২৪/৭ সাপোর্ট</span>
            <span className="hidden sm:inline-flex items-center gap-1.5">গড় উত্তর ১২ মিনিট</span>
            <span className="inline-flex items-center gap-1.5">৪.৮ রেটিং</span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 font-semibold tracking-wide">🇧🇩 Made for Bangladesh</span>
        </div>
      </div>

      {/* hero */}
      <section className="mx-auto max-w-[1180px] px-4 md:px-6 pt-12 md:pt-16 pb-6 text-center">
        <h1 className="bangla text-[32px] md:text-[46px] font-bold tracking-[-0.03em] leading-[1.08]">
          সচরাচর <span style={{ color: GREEN }}>জিজ্ঞাসা</span>
        </h1>
        <p className="bangla mt-3 text-[15px] md:text-[17px] text-zinc-500 max-w-[620px] mx-auto">
          bKash, ভিডিও, হোস্টিং, চ্যাট — আপনার সব প্রশ্নের উত্তর বাংলায়। ২ ক্লিকে উত্তর পান।
        </p>
      </section>

      {/* search + pills */}
      <div className="mx-auto max-w-[1180px] px-4 md:px-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="প্রশ্ন খুঁজুন... যেমন bKash পেমেন্ট"
            className="w-full rounded-2xl border border-zinc-200 bg-white py-3.5 pl-12 pr-16 text-[15px] outline-none focus:border-[#0E7C3A] focus:ring-2 focus:ring-[#0E7C3A]/20"
          />
          <kbd className="absolute right-4 top-1/2 -translate-y-1/2 rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-400">/</kbd>
        </div>
        <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto pb-1">
          {CATS.map((c) => (
            <button key={c.key} onClick={() => setCat(c.key)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-[14px] font-medium transition ${cat === c.key ? 'bg-[#0E7C3A] text-white shadow' : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100'}`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* list + sidebar */}
      <div className="mx-auto max-w-[1180px] px-4 md:px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            <p className="bangla mb-3 text-[13px] font-medium text-zinc-400">{filtered.length} টি প্রশ্ন</p>
            <div className="space-y-3">
              {filtered.length === 0 && (
                <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
                  <p className="bangla text-[15px] text-zinc-500">কোনো মিল পাওয়া যায়নি। নিচের WhatsApp / ইমেইল করুন।</p>
                  <Link href="/contact" className="bangla mt-3 inline-block font-semibold text-[#0E7C3A]">যোগাযোগ করুন →</Link>
                </div>
              )}
              {filtered.map((f) => {
                const open = openId === f.id
                return (
                  <div key={f.id} className={`overflow-hidden rounded-2xl border bg-white transition ${open ? 'border-[#0E7C3A]/40 ring-1 ring-[#0E7C3A]/20' : 'border-zinc-200'}`}>
                    <button onClick={() => setOpenId(open ? null : f.id)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
                      <span className="bangla text-[15px] font-semibold leading-snug">{f.q}</span>
                      <ChevronDown className={`h-5 w-5 shrink-0 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                    {open && (
                      <div className="px-5 pb-5">
                        <p className="bangla text-[14px] leading-6 text-zinc-600">{f.a}</p>
                        {f.link && (
                          <Link href={f.link.href} className="bangla mt-3 inline-flex items-center gap-1 text-[14px] font-semibold text-[#0E7C3A]">
                            {f.link.label} →
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          {/* SIDEBAR */}
          <aside className="hidden lg:block">
            <div className="sticky top-[96px] space-y-4">
              <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                <p className="bangla text-[15px] font-bold">উত্তর পাননি?</p>
                <p className="bangla mt-1 text-[13px] text-zinc-500">১২ মিনিটের মধ্যে রিয়েল মানুষ উত্তর দেয়।</p>
                <div className="mt-4 space-y-2">
                  <a href={WHATSAPP} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl bg-[#0E7C3A] px-4 py-3 text-[14px] font-semibold text-white transition hover:bg-[#0c6c33]">
                    <MessageCircle className="h-5 w-5" /> WhatsApp করুন
                  </a>
                  <a href={EMAIL}
                    className="flex items-center gap-3 rounded-xl border border-zinc-200 px-4 py-3 text-[14px] font-semibold text-zinc-700 transition hover:bg-zinc-50">
                    <Mail className="h-5 w-5 text-[#0E7C3A]" /> ইমেইল লিখুন
                  </a>
                  <a href={CALL}
                    className="flex items-center gap-3 rounded-xl border border-zinc-200 px-4 py-3 text-[14px] font-semibold text-zinc-700 transition hover:bg-zinc-50">
                    <Phone className="h-5 w-5 text-[#0E7C3A]" /> কল করুন
                  </a>
                </div>
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#0E7C3A]/8 p-3 text-[13px] text-zinc-600">
                  <Clock className="h-4 w-4 text-[#0E7C3A]" />
                  <span className="bangla">গড় উত্তর ১২ মিনিট • কোনো বট নয়</span>
                </div>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                <p className="bangla text-[15px] font-bold">জনপ্রিয় নিবন্ধ</p>
                <ul className="mt-3 space-y-2 text-[14px]">
                  <li><Link href="/hosting" className="bangla text-zinc-600 hover:text-[#0E7C3A]">হোস্টিং মাইগ্রেশন গাইড</Link></li>
                  <li><Link href="/browser" className="bangla text-zinc-600 hover:text-[#0E7C3A]">YouTube summary গাইড</Link></li>
                  <li><Link href="/pricing" className="bangla text-zinc-600 hover:text-[#0E7C3A]">প্ল্যান কীভাবে বাছবেন</Link></li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
