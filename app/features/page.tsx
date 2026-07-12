'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Mic, Type, Sparkles, Subtitles, Palette, Frame, Server, Cloud,
  LayoutDashboard, Repeat, MessageSquare, FileText, FileSearch, Globe,
  Youtube, Lock, Code2, Boxes, Rocket, Gamepad2, Zap, ShieldCheck,
  Check, X,
} from 'lucide-react'

const GREEN = '#0E7C3A'
const RED = '#E4312B'

type Cat = 'All' | 'Video' | 'Hosting' | 'Chat' | 'Browser' | 'Dev' | 'Gaming'
const TABS: Cat[] = ['All', 'Video', 'Hosting', 'Chat', 'Browser', 'Dev', 'Gaming']

const VIDEO_FEATURES = [
  { icon: Mic, title: 'Bangla Voiceover', sub: 'সুমাইয়া', desc: 'ElevenLabs + OpenAI toggle, male/female Bangla voice — natural, not robotic.' },
  { icon: Type, title: 'Perfect Bangla Font', sub: 'য-ফলা', desc: 'Before/after: broken য-ফলা → fixed. Our #1 bug report, now solved.' },
  { icon: Sparkles, title: 'Hook Generator', sub: 'ঈদে সবাই তাকিয়ে থাকবে', desc: 'Scroll-stopping hooks from your niche — ঈদ, পূজা, রমজান ready.' },
  { icon: Subtitles, title: 'Caption Styles', sub: 'Pop / Minimal / Bold', desc: 'Reels-ready caption presets, animated, on-brand.' },
  { icon: Palette, title: 'Brand Kit', sub: 'Auto apply', desc: 'Logo, colors, fonts auto-applied to every video.' },
  { icon: Frame, title: 'Safe Areas', sub: '9:16 / 1:1 / 16:9', desc: 'Auto safe-area + aspect presets for every platform.' },
]

const HOSTING_FEATURES = [
  { icon: Server, title: 'BDIX 20ms', sub: 'Low latency', desc: 'Bangladesh local peering — fastest load for BD visitors.' },
  { icon: Cloud, title: 'NVMe SSD', sub: 'Fast I/O', desc: 'Pure NVMe storage, no spinning disks.' },
  { icon: LayoutDashboard, title: 'Bangla cPanel', sub: 'Easy', desc: 'Bangla-first control panel — no English struggle.' },
  { icon: Repeat, title: 'bKash Auto', sub: 'Renew', desc: 'Auto-renew via bKash, Nagad, Rocket.' },
]

const CHAT_FEATURES = [
  { icon: MessageSquare, title: 'Bangla Email Writer', sub: 'Tone', desc: 'Write Bangla/English emails in your brand voice.' },
  { icon: FileText, title: 'Product Description', sub: 'SEO', desc: 'Generate ফেসবুক/শপ সিটি listings in seconds.' },
  { icon: FileSearch, title: 'PDF Chat', sub: 'Upload', desc: 'Ask questions to any PDF, get Bangla answers.' },
]

const BROWSER_FEATURES = [
  { icon: Globe, title: 'URL → Bangla Summary', sub: 'Instant', desc: 'Paste any link, get a Bangla summary.' },
  { icon: Youtube, title: 'YouTube Transcript', sub: 'Extract', desc: 'Pull transcript + summarize any video.' },
  { icon: Lock, title: 'Private Ollama', sub: 'Local', desc: 'Your data stays private — local AI model.' },
]

const DEV_FEATURES = [
  { icon: Code2, title: 'Monaco in Browser', sub: 'VS Code', desc: 'Full editor, no install.' },
  { icon: Boxes, title: 'Pyodide Python', sub: 'No Install', desc: 'Run Python right in the browser.' },
  { icon: Rocket, title: 'One-Click Deploy', sub: 'hostamar.dev', desc: 'Free subdomain + SSL, live in a click.' },
]

const GAMING_FEATURES = [
  { icon: Gamepad2, title: 'No Download HTML5', sub: 'Instant Play', desc: 'Open link, play — zero install.' },
  { icon: Zap, title: 'BD Server Low Ping', sub: '১৫ms', desc: 'Dhaka server, fast gameplay.' },
  { icon: ShieldCheck, title: 'bKash Entry / Payout', sub: 'Auto', desc: 'Entry fee + prizes via bKash.' },
]

const COMPARE = [
  { name: 'bKash / Nagad / Rocket', hostamar: true, others: false },
  { name: 'Bangla Voiceover (natural)', hostamar: true, others: false },
  { name: 'BDIX local server (20ms)', hostamar: true, others: false },
  { name: 'Bangla cPanel', hostamar: true, others: false },
  { name: 'Dollar payment only', hostamar: false, others: true },
  { name: 'Bangla font (য-ফলা) broken', hostamar: false, others: true },
]

type Feat = { icon: React.ElementType; title: string; sub: string; desc: string; accent?: boolean }

function Card({ icon: Ic, title, sub, desc, accent, className = '' }: Feat & { className?: string }) {
  return (
    <div className={`rounded-2xl border bg-white p-4 transition hover:shadow-[0_12px_32px_-18px_rgba(0,0,0,0.25)] ${accent ? 'border-[#0E7C3A] ring-1 ring-[#0E7C3A]/30' : 'border-zinc-200'} ${className}`}>
      <div className={`grid h-9 w-9 place-items-center rounded-xl ${accent ? 'bg-[#0E7C3A] text-white' : 'bg-[#0E7C3A]/10 text-[#0E7C3A]'}`}>
        <Ic className="h-5 w-5" />
      </div>
      <h3 className="bangla mt-3 text-[15px] font-semibold leading-tight">{title}</h3>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#0E7C3A]">{sub}</p>
      <p className="bangla mt-1.5 text-[13px] leading-5 text-zinc-500">{desc}</p>
    </div>
  )
}

function SectionHead({ kicker, title, desc, badge }: { kicker: string; title: string; desc: string; badge?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-wide text-[#0E7C3A]">{kicker}</p>
        <h2 className="bangla text-[22px] md:text-[28px] font-bold leading-tight">{title}</h2>
        <p className="bangla mt-1 text-[13px] text-zinc-500 max-w-[640px]">{desc}</p>
      </div>
      {badge && (
        <span className="rounded-full bg-[#0E7C3A]/10 px-3 py-1.5 text-[12px] font-semibold text-[#0E7C3A]">{badge}</span>
      )}
    </div>
  )
}

export default function FeaturesPage() {
  const [tab, setTab] = useState<Cat>('All')

  const show = (c: Cat) => tab === 'All' || tab === c
  const active = (c: Cat) =>
    tab === c ? 'bg-[#0E7C3A] text-white shadow' : 'text-zinc-600 hover:bg-zinc-100'

  return (
    <div className="min-h-screen bg-[#FCFCF9] text-zinc-900">
      {/* Green trust banner */}
      <div className="w-full bg-[#0E7C3A] text-white text-[12px] md:text-[13px] leading-none">
        <div className="mx-auto max-w-[1180px] px-4 md:px-6 h-9 flex items-center justify-between gap-2">
          <div className="flex items-center gap-4 md:gap-6 font-medium">
            <span className="flex items-center gap-1.5"><Mic className="w-3.5 h-3.5 opacity-90" /> 500+ ক্রিয়েটর</span>
            <span className="hidden sm:inline-flex items-center gap-1.5">10k+ ভিডিও</span>
            <span className="inline-flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 fill-white" /> 4.8 রেটিং</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline opacity-80">Made for Bangladesh</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 font-semibold tracking-wide">🇧🇩 BDIX • bKash Ready</span>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-[1180px] px-4 md:px-6 pt-14 md:pt-20 pb-8 text-center">
        <h1 className="bangla text-[34px] md:text-[50px] font-bold tracking-[-0.03em] leading-[1.06]">
          Silicon Valley টুল নয়, <span style={{ color: GREEN }}>আপনার দোকানের জন্য বানানো</span>
        </h1>
        <p className="bangla mt-4 text-[15px] md:text-[17px] text-zinc-500 max-w-[680px] mx-auto">
          CapCut নয়, Canva নয় — বাংলাদেশের SME-এর জন্য AI ভিডিও, হোস্টিং, চ্যাট, ব্রাউজার, IDE ও গেমিং একসাথে।
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {['BDIX', 'bKash', 'য-ফলা'].map((c) => (
            <span key={c} className="rounded-full bg-white border border-zinc-200 px-3.5 py-1.5 text-[13px] font-semibold text-zinc-700">
              {c}
            </span>
          ))}
        </div>
      </section>

      {/* Sticky tabs */}
      <div className="sticky top-[64px] z-30 bg-[#FCFCF9]/90 backdrop-blur border-b border-zinc-200/70">
        <div className="mx-auto max-w-[1180px] px-4 md:px-6">
          <div className="scrollbar-none flex gap-2 overflow-x-auto py-3">
            {TABS.map((c) => (
              <button key={c} onClick={() => setTab(c)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-[14px] font-medium transition ${active(c)}`}>
                {c === 'All' ? 'সব' : c === 'Video' ? 'ভিডিও' : c === 'Hosting' ? 'হোস্টিং' : c === 'Chat' ? 'চ্যাট' : c === 'Browser' ? 'ব্রাউজার' : c === 'Dev' ? 'Dev' : 'গেমিং'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1180px] px-4 md:px-6 pb-16 space-y-14 pt-10">
        {/* VIDEO */}
        {show('Video') && (
          <section id="video" className="scroll-mt-[128px]">
            <SectionHead kicker="Video • AI" title="ভিডিও — রিয়েল ডেমো, আইকন নয়" desc="বাংলাদেশের ক্রিয়েটরের জন্য বানানো AI ভিডিও টুল।" badge="সবচেয়ে জনপ্রিয়" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Card {...VIDEO_FEATURES[0]} className="sm:col-span-2 lg:col-span-2" />
              <Card {...VIDEO_FEATURES[1]} />
              <Card {...VIDEO_FEATURES[2]} className="sm:col-span-2 lg:col-span-1" />
              <Card {...VIDEO_FEATURES[3]} />
              <Card {...VIDEO_FEATURES[4]} />
              <Card {...VIDEO_FEATURES[5]} />
            </div>
          </section>
        )}

        {/* HOSTING */}
        {show('Hosting') && (
          <section id="hosting" className="scroll-mt-[128px]">
            <SectionHead kicker="Hosting • BDIX" title="হোস্টিং — বাংলাদেশে দ্রুততম" desc="BDIX 20ms, NVMe, Bangla cPanel, bKash auto-renew।" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {HOSTING_FEATURES.map((f) => <Card key={f.title} {...f} />)}
            </div>
          </section>
        )}

        {/* CHAT */}
        {show('Chat') && (
          <section id="chat" className="scroll-mt-[128px]">
            <SectionHead kicker="Chat • AI" title="চ্যাট — আপনার বাংলা অ্যাসিস্টেন্ট" desc="ইমেইল, প্রোডাক্ট ডেস্ক্রিপশন, PDF — সব বাংলায়।" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {CHAT_FEATURES.map((f) => <Card key={f.title} {...f} />)}
            </div>
          </section>
        )}

        {/* BROWSER */}
        {show('Browser') && (
          <section id="browser" className="scroll-mt-[128px]">
            <SectionHead kicker="Browser • AI" title="ব্রাউজার — লিংক থেকে সামারি" desc="URL → Bangla summary, YouTube transcript, private Ollama।" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {BROWSER_FEATURES.map((f) => <Card key={f.title} {...f} />)}
            </div>
          </section>
        )}

        {/* DEV */}
        {show('Dev') && (
          <section id="dev" className="scroll-mt-[128px]">
            <SectionHead kicker="Dev • IDE" title="Dev — ব্রাউজারেই কোড" desc="Monaco, Pyodide Python, এক ক্লিকে hostamar.dev deploy।" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {DEV_FEATURES.map((f) => <Card key={f.title} {...f} />)}
            </div>
          </section>
        )}

        {/* GAMING */}
        {show('Gaming') && (
          <section id="gaming" className="scroll-mt-[128px]">
            <SectionHead kicker="Gaming • HTML5" title="গেমিং — ডাউনলোড ছাড়া গেম" desc="BD সার্ভারে লো পিং, AI অপোনেন্ট, bKash পেআউট।" badge="No Download" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {GAMING_FEATURES.map((f) => <Card key={f.title} {...f} accent={f.title.includes('bKash')} />)}
            </div>
          </section>
        )}

        {/* COMPARISON */}
        <section id="compare" className="scroll-mt-24">
          <div className="rounded-[24px] bg-zinc-900 text-white p-5 md:p-8 border border-zinc-800 overflow-hidden">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
              <div>
                <h2 className="bangla text-[22px] md:text-[28px] font-bold leading-tight">Canva / InVideo / Pictory vs Hostamar</h2>
                <p className="bangla mt-1 text-[13px] text-zinc-400">তারা ডলারে, আমরা বাংলায়।</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-[14px]">
                <thead>
                  <tr className="border-b border-zinc-700 text-zinc-400">
                    <th className="py-2 pr-4 font-medium">ফিচার</th>
                    <th className="py-2 px-4 font-semibold text-[#0E7C3A]">Hostamar</th>
                    <th className="py-2 px-4 font-medium">অন্যরা</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE.map((r) => (
                    <tr key={r.name} className="border-b border-zinc-800/70">
                      <td className="bangla py-3 pr-4 text-zinc-200">{r.name}</td>
                      <td className="py-3 px-4">
                        {r.hostamar
                          ? <Check className="h-5 w-5 text-[#0E7C3A]" />
                          : <X className="h-5 w-5 text-zinc-600" />}
                      </td>
                      <td className="py-3 px-4">
                        {r.others
                          ? <Check className="h-5 w-5 text-zinc-500" />
                          : <X className="h-5 w-5 text-zinc-600" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* BUNDLE CTA */}
        <section className="rounded-[24px] bg-[#0E7C3A] text-white p-7 md:p-10 text-center">
          <h2 className="bangla text-[22px] md:text-[30px] font-bold leading-tight">
            একটি সাবস্ক্রিপশনে সব ৬টি প্রোডাক্ট
          </h2>
          <p className="bangla mt-2 text-[15px] text-white/85 max-w-[620px] mx-auto">
            ভিডিও কিনুন, হোস্টিং-চ্যাট ফ্রি পান। বাংলাদেশের একমাত্র অল-ইন-ওয়ান OS।
          </p>
          <Link href="/pricing"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[15px] font-semibold text-[#0E7C3A] transition hover:bg-white/90">
            দাম দেখুন →
          </Link>
        </section>
      </main>
    </div>
  )
}
