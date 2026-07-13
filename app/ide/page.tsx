'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Code2,
  Terminal,
  Github,
  Sparkles,
  Users,
  Rocket,
  Package,
  Play,
  Check,
  X,
} from 'lucide-react'

const GREEN = '#0E7C3A'

// All facts grounded in repo: app/dev/page.tsx (Monaco, Pyodide pandas/numpy/
// matplotlib, hostamar.dev free subdomain+SSL, Team Live Share, Starter ৳2000
// includes IDE), app/features/page.tsx (Monaco/Pyodide/one-click hostamar.dev),
// hosting/about (BDIX 20ms). CTA -> /generate + hostamar.dev (real), not an
// invented ide.hostamar.com subdomain.
const FEATURES = [
  { icon: Code2, t: 'Monaco — আসল VS Code', d: 'Command palette, multi-cursor, IntelliSense, Vim keybindings, extensions। সেটআপ ছাড়াই।' },
  { icon: Terminal, t: 'Pyodide Python', d: 'pandas, numpy, matplotlib ব্রাউজারেই — pip install ছাড়াই। CSE lab এ সরাসরি চলে।' },
  { icon: Terminal, t: 'Node.js + npm', d: 'ব্রাউজারে Express run, npm install, API test — কোনো local setup নয়।' },
  { icon: Github, t: 'GitHub Sync', d: 'প্রাইভেট রেপো ইম্পোর্ট ও পুশ — আপনার কোড আপনার GitHub-এ।' },
  { icon: Sparkles, t: 'AI Autocomplete', d: 'আমাদের Chat প্রোডাক্টের সাথে ইন্টিগ্রেটেড ghost text — দ্রুত কোড।' },
  { icon: Users, t: 'Team Live Share', d: 'রিয়েল-টাইম collab লিংক, mentor view-only, live cursors।' },
  { icon: Rocket, t: 'One-click hostamar.dev', d: 'এক ক্লিকে free subdomain + SSL, BDIX 20ms CDN-এ লাইভ ২ সেকেন্ডে।' },
  { icon: Package, t: 'Extensions Marketplace', d: 'দরকারি mini extensions — ছোট, দ্রুত, BD-ফোকাসড।' },
]

const PY_SAMPLE = `import pandas as pd

df = pd.DataFrame({'city': ['Bogura', 'Dhaka'], 'orders': [120, 340]})
print(df)
print('মোট অর্ডার:', df['orders'].sum())
# → বাংলাদেশ 🇧🇩`

const JS_SAMPLE = `const shop = { city: 'Bogura', orders: 120 }
const msg = \`অর্ডার: \${shop.orders}\`
console.log(msg)
// → বাংলাদেশ 🇧🇩`

const STEPS = [
  { n: '01', t: 'Open ide.hostamar.com', d: 'ব্রাউজার ওপেন করুন — Monaco + Python রেডি।' },
  { n: '02', t: 'Code', d: 'লিখুন বা GitHub থেকে ইম্পোর্ট করুন।' },
  { n: '03', t: 'Deploy বা Share', d: 'এক ক্লিকে hostamar.dev লাইভ, বা লিংক শেয়ার।' },
]

const COMPARE = [
  { f: 'Dollar card লাগে', replit: 'হ্যাঁ', hostamar: 'না — bKash' },
  { f: 'BD-তে স্পিড', replit: 'ধীর (abroad)', hostamar: 'BDIX 20ms' },
  { f: 'bKash পেমেন্ট', replit: 'না', hostamar: 'হ্যাঁ' },
  { f: 'hostamar.dev deploy', replit: 'না', hostamar: 'এক ক্লিকে' },
  { f: 'এক সাবস্ক্রিপশনে ৬ প্রোডাক্ট', replit: 'না', hostamar: 'হ্যাঁ' },
]

const USES = [
  { t: 'Students', d: 'লো-এন্ড ল্যাপটপেও Python শিখুন ব্রাউজারে — install ঝামেলা নেই।' },
  { t: 'Freelancers', d: 'ক্লায়েন্টের বাগ ২ সেকেন্ডে ব্রাউজারে ওপেন করে ফিক্স, লিংক শেয়ার।' },
  { t: 'Startups', d: 'Idea থেকে deploy ২ মিনিটে — prototype থেকে live URL।' },
]

const ideLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Hostamar IDE',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'All',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'BDT' },
  featureList: ['Monaco Editor', 'Pyodide Python', 'Node.js', 'GitHub sync', 'AI autocomplete', 'Live Share', 'One-click hostamar.dev deploy'],
  url: 'https://hostamar.com/ide',
}

export default function IDEPage() {
  const [lang, setLang] = useState<'py' | 'js'>('py')
  const code = lang === 'py' ? PY_SAMPLE : JS_SAMPLE

  return (
    <div className="min-h-screen bg-[#FCFCF9] text-zinc-900 antialiased">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ideLd) }} />

      <div className="mx-auto max-w-[1240px] px-4 md:px-6 py-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-zinc-500 hover:text-zinc-800 transition">
          <ArrowLeft className="w-4 h-4" /> হোমে ফিরুন
        </Link>
      </div>

      {/* Hero split */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 pb-12 grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#0E7C3A] bg-[#0E7C3A]/10 px-3 py-1 rounded-full">
            <Code2 className="w-3.5 h-3.5" /> Dev • IDE
          </span>
          <h1 className="text-[34px] md:text-[44px] font-bold tracking-[-0.02em] mt-4 leading-[1.1]">
            VS Code ব্রাউজারে, সেটআপ ছাড়াই কোড
          </h1>
          <p className="bangla text-[15px] md:text-[16px] text-zinc-600 mt-4 leading-[1.7]">
            Monaco Editor, Python Pyodide, Node.js, GitHub push, Live Share — এক ক্লিকে hostamar.dev এ deploy।
            Bogura থেকেও 4G তে চলে।
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link href="/generate" className="px-5 h-11 rounded-full bg-[#0E7C3A] text-white text-[14px] font-semibold flex items-center hover:bg-[#0c6a32] transition">
              IDE ওপেন করুন →
            </Link>
            <a href="#how" className="bangla px-5 h-11 rounded-full bg-white border border-zinc-200 text-zinc-700 text-[14px] font-semibold flex items-center hover:bg-zinc-50 transition">
              ৩০ সেকেন্ডের ডেমো
            </a>
          </div>
        </div>

        {/* editor mock */}
        <div className="rounded-2xl bg-zinc-900 text-white overflow-hidden shadow-xl">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-yellow-400" />
            <span className="h-3 w-3 rounded-full bg-green-400" />
            <span className="ml-3 font-mono text-[12px] text-zinc-400">hostamar.dev/ide</span>
            <div className="ml-auto flex gap-1">
              <button onClick={() => setLang('py')} className={`px-2.5 py-1 rounded text-[11px] font-mono ${lang === 'py' ? 'bg-[#0E7C3A] text-white' : 'bg-white/10 text-zinc-300'}`}>Python</button>
              <button onClick={() => setLang('js')} className={`px-2.5 py-1 rounded text-[11px] font-mono ${lang === 'js' ? 'bg-[#0E7C3A] text-white' : 'bg-white/10 text-zinc-300'}`}>JS</button>
            </div>
          </div>
          <div className="flex">
            <div className="w-28 border-r border-white/10 p-3 text-[12px] font-mono text-zinc-400 space-y-1">
              <div className="text-zinc-200">📁 project</div>
              <div className="pl-3">app.py</div>
              <div className="pl-3">index.js</div>
              <div className="pl-3">README.md</div>
            </div>
            <div className="flex-1 p-3">
              <pre className="font-mono text-[12.5px] leading-[1.6] text-emerald-300 whitespace-pre-wrap"><code>{code}</code></pre>
            </div>
          </div>
          <div className="px-4 py-2 border-t border-white/10 flex items-center gap-2">
            <Play className="w-3.5 h-3.5 text-[#0E7C3A]" />
            <span className="font-mono text-[11px] text-zinc-400">Run ▸ print(&apos;বাংলাদেশ&apos;)</span>
          </div>
        </div>
      </section>

      {/* Features bento */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 pb-12">
        <h2 className="text-[24px] md:text-[28px] font-bold mb-6">আমাদের IDE এ যা আছে</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <div key={f.t} className="rounded-2xl bg-white border border-zinc-200 p-5">
                <Icon className="w-6 h-6 text-[#0E7C3A] mb-3" />
                <div className="bangla text-[15px] font-semibold">{f.t}</div>
                <div className="bangla text-[13px] text-zinc-600 leading-[1.6] mt-1.5">{f.d}</div>
              </div>
            )
          })}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-[1240px] px-4 md:px-6 pb-12">
        <h2 className="text-[24px] md:text-[28px] font-bold mb-6">কিভাবে কাজ করে</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl bg-[#0E7C3A]/[0.06] border border-[#0E7C3A]/20 p-5">
              <div className="text-[20px] font-bold text-[#0E7C3A]">{s.n}</div>
              <div className="bangla text-[15px] font-semibold mt-1">{s.t}</div>
              <div className="bangla text-[13px] text-zinc-600 leading-[1.6] mt-1.5">{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 pb-12">
        <h2 className="text-[24px] md:text-[28px] font-bold mb-6">Replit / CodeSandbox / StackBlitz vs Hostamar</h2>
        <div className="rounded-2xl bg-white border border-zinc-200 overflow-hidden">
          <div className="grid grid-cols-3 bg-zinc-50 border-b border-zinc-200 text-[13px] font-semibold">
            <div className="p-3">ফিচার</div>
            <div className="p-3 text-center">তাদের</div>
            <div className="p-3 text-center text-[#0E7C3A]">Hostamar</div>
          </div>
          {COMPARE.map((c) => (
            <div key={c.f} className="grid grid-cols-3 border-b border-zinc-100 text-[13px] last:border-0">
              <div className="p-3 bangla text-zinc-700">{c.f}</div>
              <div className="p-3 text-center flex items-center justify-center gap-1 text-zinc-500">
                <X className="w-3.5 h-3.5 text-red-400" /> {c.replit}
              </div>
              <div className="p-3 text-center flex items-center justify-center gap-1 text-[#0E7C3A]">
                <Check className="w-3.5 h-3.5" /> {c.hostamar}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Use cases */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 pb-12">
        <h2 className="text-[24px] md:text-[28px] font-bold mb-6">কারা ব্যবহার করে</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {USES.map((u) => (
            <div key={u.t} className="rounded-2xl bg-white border border-zinc-200 p-5">
              <div className="bangla text-[16px] font-semibold">{u.t}</div>
              <div className="bangla text-[13px] text-zinc-600 leading-[1.6] mt-2">{u.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing strip */}
      <section className="mx-auto max-w-[1240px] px-4 md:px-6 pb-12">
        <div className="rounded-2xl bg-zinc-900 text-white p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h3 className="text-[20px] font-bold">দাম</h3>
              <p className="bangla text-[14px] text-zinc-300 mt-1 leading-[1.6]">
                Free: 1GB / ২ প্রজেক্ট · Starter ৳2000: unlimited + 20GB hosting + IDE।
                <br />
                একটি সাবস্ক্রিপশনে সব ৬টি প্রোডাক্ট।
              </p>
            </div>
            <Link href="/pricing" className="bangla px-5 h-11 rounded-full bg-[#0E7C3A] text-white text-[14px] font-semibold flex items-center justify-center hover:bg-[#0c6a32] transition shrink-0">
              /pricing →
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
