import Link from 'next/link'

export const metadata = {
  title: 'M3E Canvas Vibe-Coding — সার্ভিস #108 | Hostamar',
  description:
    'M3E Canvas (#108): lnkiai.github.io/m3e-canvas-এ ডিজাইন করো, Copy Prompt → লোকাল AI (Qwen 3.6 + Hermes) দিয়ে production-ready Next.js + Tailwind কোড। Figma-মানের মকআপ ১০x দ্রুত, ০ টাকায় লোকাল মডেলে।',
  keywords: ['M3E Canvas', 'vibe coding', 'AI mockup Bangladesh', 'Hostamar service 108', 'local AI design'],
  openGraph: {
    title: 'M3E Canvas Vibe-Coding — Hostamar সার্ভিস #108',
    description: 'Canvas-এ ডিজাইন → কপি প্রম্পট → লোকাল AI-তে কোড। ১০x দ্রুত।',
  },
}

const GREEN = '#0E7C3A'
const RED = '#E4312B'

const flows = [
  {
    n: '১',
    title: 'Canvas-এ ডিজাইন করো',
    body: 'lnkiai.github.io/m3e-canvas খোলো — কোনো সার্ভার নেই, localStorage-এ সেভ হয়। মোবাইলে বাটন-ট্যাপ, ডেস্কটপে ড্র্যাগ-ড্রপ। M3E (Material 3 Expressive) কম্পোনেন্ট — ম্যাগনেটিক কানেকশন, রাউন্ডেড কর্নার মার্জ, লিস্ট/কার্ড/সুইচ/ডায়ালগ রেডি।',
  },
  {
    n: '২',
    title: 'Copy Prompt',
    body: 'প্রতিটি অংশের behavior নোট সহ Canvas নিজেই প্রম্পট বানায়: "Target: Web, Language: English, Next.js + Tailwind expert, Build this design exactly, mobile-first, Taka pricing, bKash/Nagad buttons, output only clean code"।',
  },
  {
    n: '৩',
    title: 'লোকাল AI-তে বিল্ড',
    body: 'প্রম্পট পেস্ট করো Hermes agent / Qwen 3.6-তে — ক্লাউড ছাড়া, লোকাল মডেলে, ০ টাকায়। আউটপুট: production-ready Next.js App Router + Tailwind কোড, ডিজাইন ১০০% ম্যাচ।',
  },
]

const useCases = [
  { icon: '🎬', title: 'AI Video প্রোডাক্ট ফ্লো', body: '৪ স্ক্রিন: Template Gallery (Eid, Pohela Boishakh, 11.11) → Editor (টেক্সট+লোগো আপলোড) → Preview → Download। bKash/Nagad পেমেন্ট বাটন, বাটন-ট্যাপে পরের স্ক্রিন।' },
  { icon: '🏠', title: 'Hostamar.com নতুন Hero/Pricing পেজ', body: '৬ প্রোডাক্টের কনফিউশন সমাধান: Desktop 1280×800 + Phone 412×892 — একই স্ক্রিন, দুই width, 90% ইউজার মোবাইল।' },
  { icon: '🎛️', title: 'Hosting Dashboard / LuckyStar গেম ডিজাইন সিস্টেম', body: 'লিস্ট, কার্ড, সুইচ, ডায়ালগ — Material 3 প্যালেট, Roboto Flex, বাংলাদেশি ট্রাস্ট-কালার সিড (#0E7C3A / #E4312B)।' },
]

export default function M3ECanvasPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-4 sm:px-5 py-10">
      <div className="rounded-[24px] border bg-white overflow-hidden">
        <div className="px-5 md:px-8 py-8 md:py-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold rounded-full bg-[#F8FAFC] border px-3 py-1" style={{ color: GREEN }}>সার্ভিস #108</span>
            <span className="text-xs font-bold rounded-full px-3 py-1 text-white" style={{ background: RED }}>নতুন — GOLDMINE</span>
          </div>
          <h1 className="text-[26px] md:text-[34px] font-bold leading-tight tracking-[-0.02em] mt-3">
            M3E Canvas <span style={{ color: GREEN }}>Vibe-Coding</span>
          </h1>
          <p className="text-sm text-zinc-600 mt-3 max-w-2xl leading-relaxed">
            Canvas-এ ভিজ্যুয়াল ডিজাইন → Copy Prompt → লোকাল AI-তে production কোড। Figma-মানের মকআপ ১০ গুণ দ্রুত,
            মাসিক সাবস্ক্রিপশন নেই — লোকাল মডেলে ০ টাকায়।
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="https://lnkiai.github.io/m3e-canvas"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-full text-white px-5 py-2.5 text-sm font-bold"
              style={{ background: GREEN }}
            >
              🎨 M3E Canvas খোলো (ফ্রি)
            </a>
            <Link href="/signup" className="inline-flex rounded-full border bg-white px-5 py-2.5 text-sm font-medium hover:bg-zinc-50">
              অর্ডার করো — 40cr
            </Link>
          </div>
        </div>
      </div>

      {/* 3-step flow */}
      <div className="mt-10">
        <div className="text-xs font-semibold tracking-widest" style={{ color: GREEN }}>কীভাবে কাজ করে — ৩ ধাপ</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {flows.map((f) => (
            <div key={f.n} className="rounded-2xl border bg-white p-5">
              <div className="w-8 h-8 rounded-full text-white flex items-center justify-center text-sm font-bold" style={{ background: GREEN }}>
                {f.n}
              </div>
              <div className="font-bold mt-3">{f.title}</div>
              <p className="text-sm text-zinc-600 mt-2 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Use cases */}
      <div className="mt-10">
        <h2 className="text-2xl font-bold">৩টা সবচেয়ে দরকারি ব্যবহার</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          {useCases.map((u) => (
            <div key={u.title} className="rounded-2xl border-2 bg-white p-5 hover:border-[#0E7C3A] transition-colors">
              <div className="text-2xl">{u.icon}</div>
              <div className="font-bold mt-2">{u.title}</div>
              <p className="text-sm text-zinc-600 mt-2 leading-relaxed">{u.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* First ready prompt */}
      <div className="mt-10 rounded-2xl border-2 bg-[#F8FAFC] p-6">
        <div className="text-xs font-semibold tracking-widest" style={{ color: GREEN }}>রেডি প্রম্পট — প্রথম M3E প্রম্পট (কপি করে লোকাল AI-তে পেস্ট করো)</div>
        <pre className="mt-3 text-xs md:text-sm bg-white border rounded-xl p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed">You are a Next.js + Tailwind expert. Build this design exactly: Target: Web. Language: English UI.
Screens: AI Video product — (1) Template Gallery: Eid, Pohela Boishakh, 11.11 offer cards, (2) Editor: text + logo upload, (3) Preview, (4) Download with bKash + Nagad payment buttons.
Tech: Next.js App Router + Tailwind CSS, mobile-first.
Device frames: Desktop 1280x800 and Phone 412x892 side by side — phone primary (90% users mobile).
Theme: Material 3 palette, seed green #0E7C3A / red #E4312B, rounded shapes, font Roboto Flex.
Pricing in Bangladeshi Taka: 0 / 2,000 / 3,500. Payment: bKash + Nagad buttons.
Button tap → next screen (click flow). Output only clean code, no explanation. Design must match 100%.</pre>
        <p className="text-xs text-zinc-500 mt-3">
          এই প্রম্পটটা Qwen 3.6 / Hermes agent-এ পেস্ট করলেই সম্পূর্ণ AI Video ফ্লো-এর কোড পেয়ে যাবে।
        </p>
      </div>

      {/* Back links */}
      <div className="mt-8 flex flex-wrap gap-3 text-sm">
        <Link href="/store" className="rounded-full border bg-white px-5 py-2.5 font-medium hover:bg-zinc-50">
          ← সব সার্ভিস (Store)
        </Link>
        <Link href="/docs" className="rounded-full border bg-white px-5 py-2.5 font-medium hover:bg-zinc-50">
          ডকস
        </Link>
      </div>
    </div>
  )
}
