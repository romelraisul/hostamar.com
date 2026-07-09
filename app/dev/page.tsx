'use client'
import React, { useState } from "react";

const nav = ["Editor", "Templates", "Deploy", "Pricing"];

export default function App() {
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-[#FCFCF9] text-zinc-900 selection:bg-[#0E7C3A]/20">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        .font-bn { font-family: "Hind Siliguri", sans-serif; }
        .font-en { font-family: "Inter", sans-serif; }
        .font-mono { font-family: "JetBrains Mono", monospace; }
      `}</style>

      {/* Trust bar */}
      <div className="w-full bg-[#0F1115] text-zinc-300 text-[11px] md:text-xs font-en tracking-wide">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 md:gap-6">
          <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>500+ developers</span>
          <span className="opacity-30">•</span>
          <span>99.9% uptime • Dhaka edge</span>
          <span className="opacity-30">•</span>
          <span>Made in Bangladesh</span>
          <span className="opacity-30 hidden sm:inline">•</span>
          <span className="text-white font-medium">Free tier • কোনো কার্ড লাগবে না</span>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#FCFCF9]/80 border-b border-zinc-200/60">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 h-[64px] flex items-center justify-between">
          <div className="flex items-center gap-8">
            <a href="#" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0E7C3A] flex items-center justify-center text-white font-mono font-bold text-[16px]">{"</>"}</div>
              <div className="leading-none">
                <div className="font-en font-extrabold text-[16px] tracking-tight">Hostamar <span className="text-[#0E7C3A]">/dev</span></div>
                <div className="font-mono text-[10px] tracking-widest text-zinc-500 -mt-0.5">BROWSER IDE</div>
              </div>
            </a>
            <nav className="hidden md:flex items-center gap-6">
              {nav.map(n => <a key={n} href={`#${n.toLowerCase()}`} className="font-en text-sm text-zinc-600 hover:text-zinc-900 transition">{n}</a>)}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <a href="https://hostamar.com/generate" className="hidden md:inline-flex font-en text-sm px-3 py-2 rounded-full hover:bg-zinc-100 transition">Log in</a>
            <a href="https://hostamar.com/generate" className="inline-flex items-center justify-center font-bn font-semibold text-[14px] md:text-[15px] bg-[#0E7C3A] text-white px-4 md:px-5 h-9 md:h-10 rounded-full shadow-[0_6px_20px_-8px_#0E7C3A] hover:bg-[#0c6a32] transition">ফ্রি IDE চালু করুন</a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-[1200px] mx-auto px-4 md:px-6 pt-10 md:pt-20 pb-10 md:pb-16 grid lg:grid-cols-[1.05fr_1fr] gap-10 md:gap-12 items-start">
        <div className="pt-2">
          <div className="inline-flex items-center gap-2 bg-white border border-zinc-200 rounded-full px-3 py-1 text-[11px] font-en shadow-sm">
            <span className="bg-[#E4312B] text-white px-2 py-0.5 rounded-full font-bold tracking-wide">NEW</span>
            <span className="text-zinc-700">Pyodide Python + AI ghost text এখন লাইভ</span>
          </div>
          <h1 className="font-bn font-bold leading-[1.08] tracking-tight text-[32px] md:text-[56px] mt-5">
            ব্রাউজারে <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-[#0F1115] text-white text-[0.78em] align-middle translate-y-[-2px] font-mono font-medium tracking-normal">VS Code</span>,<br/>
            GitHub, AI —<br/>
            <span className="text-[#0E7C3A]">Deploy এক ক্লিকে</span>
          </h1>
          <p className="font-bn text-[16px] md:text-[18px] leading-[1.6] text-zinc-600 mt-5 max-w-[520px]">
            ল্যাপটপ স্লো? RAM 4GB? সমস্যা নেই। Hostamar Cloud এ কোড লিখুন, AI দিয়ে অটোকমপ্লিট করুন, এক ক্লিকে Vercel এর মতো deploy করুন — <span className="font-semibold text-zinc-800">bKash দিয়ে পেমেন্ট</span>
          </p>

          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <a href="https://hostamar.com/generate" className="inline-flex h-12 px-6 items-center justify-center rounded-full bg-[#0F1115] text-white font-bn font-semibold text-[16px] hover:bg-black transition">ব্রাউজারে কোড শুরু করুন →</a>
            <a href="https://hostamar.com/generate" className="inline-flex h-12 px-6 items-center justify-center rounded-full bg-white border border-zinc-200 font-en text-sm font-medium hover:bg-zinc-50 transition gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577v-2.165c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.085 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.76-1.605-2.665-.305-5.466-1.334-5.466-5.931 0-1.31.469-2.381 1.236-3.221-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.301 1.23A11.48 11.48 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.873.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.371.823 1.102.823 2.222v3.293c0 .322.218.694.825.576C20.565 21.795 24 17.3 24 12c0-6.63-5.37-12-12-12Z"/></svg> GitHub দিয়ে Login</a>
          </div>

          <div className="mt-6 inline-flex items-center gap-2 font-mono text-[12px] bg-zinc-900 text-zinc-100 rounded-full pl-3 pr-1.5 py-1.5 shadow">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="opacity-80">npm run dev →</span>
            <span className="text-emerald-300">https://yourapp.hostamar.dev</span>
            <span className="bg-white/10 rounded-full px-2.5 py-1">live in 2s</span>
          </div>

          <div className="mt-8 flex items-center gap-3 text-[12px] font-en text-zinc-500 flex-wrap">
            <span className="flex -space-x-2">
              <span className="w-7 h-7 rounded-full border-2 border-[#FCFCF9] bg-zinc-900 text-white grid place-items-center text-[10px] font-bold">B</span>
              <span className="w-7 h-7 rounded-full border-2 border-[#FCFCF9] bg-[#0E7C3A] text-white grid place-items-center text-[10px] font-bold">S</span>
              <span className="w-7 h-7 rounded-full border-2 border-[#FCFCF9] bg-zinc-200 text-zinc-700 grid place-items-center text-[10px] font-bold">N</span>
            </span>
            <span className="leading-tight">Trusted by CSE students from BUET, SUST, NSU</span>
          </div>
        </div>

        {/* IDE mock */}
        <div className="relative">
          <div className="rounded-[20px] overflow-hidden bg-[#0F1115] border border-zinc-800 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]">
            {/* Top bar */}
            <div className="h-11 flex items-center justify-between px-4 border-b border-white/10 bg-[#15181E]">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5"><span className="w-3 h-3 rounded-full bg-[#E4312B]"/><span className="w-3 h-3 rounded-full bg-amber-400"/><span className="w-3 h-3 rounded-full bg-emerald-500"/></div>
                <div className="ml-3 hidden md:flex items-center gap-2 font-mono text-[11px] text-zinc-400"><span className="px-2 py-1 rounded bg-white/10">main</span><span>● Saved</span></div>
              </div>
              <div className="font-mono text-[11px] text-zinc-500">hostamar.com/generate • /dev/editor</div>
              <div className="w-20" />
            </div>
            <div className="grid grid-cols-[150px_1fr_150px] md:grid-cols-[180px_1fr_220px] min-h-[420px] md:min-h-[480px]">
              {/* file tree */}
              <div className="bg-[#111318] border-r border-white/10 p-3 font-mono text-[11px] leading-6 text-zinc-400 hidden sm:block">
                <div className="text-[10px] tracking-widest text-zinc-500 mb-2">EXPLORER</div>
                <div className="text-white">▶ app</div>
                <div className="pl-4"> <span className="text-sky-400">page.tsx</span> <span className="text-emerald-400">●</span></div>
                <div className="pl-4"> layout.tsx</div>
                <div className="mt-2 text-white">▶ components</div>
                <div className="pl-4"> VideoCard.tsx</div>
                <div className="pl-4"> DeployBtn.tsx</div>
                <div className="mt-3 text-zinc-500">▶ public</div>
                <div className="mt-4 text-[10px]">OUTLINE • TIMELINE</div>
                <div className="mt-6 p-2 rounded-lg bg-white/[0.06] border border-white/10">
                  <div className="text-white text-[11px]">AI Chat</div>
                  <div className="font-bn text-[11px] mt-1 leading-snug">এই কোডে bug কোথায়?</div>
                  <div className="mt-2 text-[10px] text-zinc-400 leading-snug">`generateVideo` এ prompt Bangla হলে encode করুন...</div>
                </div>
              </div>
              {/* editor */}
              <div className="bg-[#0F1115] p-3 md:p-4 font-mono text-[12px] md:text-[12.5px] leading-[1.75] overflow-hidden">
                <div className="flex gap-2 text-[11px] mb-3"><span className="px-2 py-0.5 rounded bg-[#1E232D] text-zinc-300">page.tsx</span><span className="px-2 py-0.5 rounded text-zinc-500">+ New Tab</span></div>
                <pre className="whitespace-pre-wrap break-words">
{`import { VideoCard } from "@/components/VideoCard"

export default function Page() {
  `}
                  <span className="text-zinc-500">{`// ঈদ অফার ভিডিও জেনারেট`}</span>{`
  `}
                  <span className="text-violet-400">const</span>{` `}
                  <span className="text-sky-300">video</span>{` `}
                  <span className="text-zinc-400">=</span>{` `}
                  <span className="text-amber-300">await</span>{` `}
                  <span className="text-emerald-300">generateVideo</span>{`({`}
                  <br/>{`    `}
                  <span className="text-zinc-400">prompt:</span>{` `}
                  <span className="text-amber-200">'ঈদ অফার - ৫০% ছাড়'</span>{`, `}
                  <br/>{`    `}
                  <span className="text-zinc-400">voice:</span>{` `}
                  <span className="text-amber-200">'bn-female'</span>{`
  })

  `}
                  <span className="text-zinc-600 italic">{"/* AI ghost → press Tab */"}</span>
                  <br/>
                  <span className="text-zinc-500/60">{`  return <VideoCard src={video.url} cta="bKash এ পে করুন" />`}</span>
                </pre>
                <div className="mt-4 rounded-lg bg-[#151A23] border border-white/10 p-2.5 font-mono text-[11px]">
                  <div className="flex justify-between text-zinc-500"><span>PROBLEMS 0</span><span>AI COMPLETION ✓</span></div>
                  <div className="mt-2 h-1.5 w-full bg-white/10 rounded-full overflow-hidden"><div className="h-full w-[68%] bg-emerald-500"/></div>
                </div>
              </div>
              {/* terminal */}
              <div className="bg-[#0B0D11] border-l border-white/10 p-2.5 font-mono text-[11px] hidden md:flex flex-col">
                <div className="text-zinc-500 mb-2">TERMINAL</div>
                <div className="text-zinc-300">$ npm run dev</div>
                <div className="text-emerald-400">✓ Ready in 1.2s</div>
                <div className="text-zinc-400">○ Local: http://localhost:3000</div>
                <div className="text-sky-300">● Network: https://arafat.hostamar.dev</div>
                <div className="mt-3 text-zinc-500">AI LOGS</div>
                <div className="text-zinc-400 leading-relaxed">✔ DeepSeek Coder loaded<br/>✔ Bangla comment → code</div>
                <div className="mt-auto rounded-lg bg-[#E4312B]/10 border border-[#E4312B]/20 p-2 text-[#ffb4b0]">Deploy → Dhaka CDN<br/><span className="text-white/70">free SSL issued</span></div>
              </div>
            </div>
          </div>
          <div className="absolute -z-10 -bottom-10 -right-10 w-[320px] h-[320px] rounded-full bg-[#0E7C3A]/20 blur-[80px] pointer-events-none hidden md:block" />
        </div>
      </section>

      {/* Features bento */}
      <section id="editor" className="max-w-[1200px] mx-auto px-4 md:px-6 py-12 md:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <div className="font-en text-[12px] tracking-widest text-zinc-500">FEATURES</div>
            <h2 className="font-bn font-bold text-[28px] md:text-[36px] leading-tight mt-1">আসল VS Code এর পাওয়ার, ব্রাউজারে</h2>
          </div>
          <div className="font-bn text-sm text-zinc-600 max-w-[360px]">কোনো Extension বা Node install করতে হবে না। ওপেন করলেই Monaco, Python, AI সব রেডি।</div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 md:gap-5 auto-rows-[1fr]">
          {[
            {k:"Monaco Editor", bn:"আসল VS Code, Vim keybindings, Extensions", icon:"◧", desc:"VS Code এর core engine. Command palette, multi-cursor, IntelliSense সব আছে।", accent:""},
            {k:"Pyodide Python", bn:"ব্রাউজারে Python run, no install", icon:"🐍", desc:"pandas, numpy, matplotlib সব ব্রাউজারে। CSE lab এ pip install ছাড়াই।", accent:"bg-[#FFF6E8]"},
            {k:"AI Code Completion", bn:"CodeLlama, DeepSeek Coder", icon:"✦", desc:"inline ghost text, Bangla comment → code, বাগ ফিক্স সাজেশন।", accent:"border-[#0E7C3A]/20 bg-[#0E7C3A]/[0.06]"},
            {k:"GitHub Integration", bn:"Clone, Commit, Push, PR", icon:"⎇", desc:"OAuth এ লগইন, রিপো ক্লোন, ব্রাউজার থেকেই PR খুলুন।", accent:""},
            {k:"One-click Deploy", bn:"Node.js, Next.js, FastAPI", icon:"▲", desc:"hostamar.com subdomain, free SSL, Dhaka CDN, 2s live।", accent:"bg-[#0F1115] text-white"},
            {k:"Team Live Share", bn:"একসাথে কোড, mentor দেখবে", icon:"◎", desc:"Live cursors, voice notes, mentor view-only লিংক।", accent:""},
          ].map((f,i)=>(
            <div key={i} className={`rounded-[20px] border p-5 md:p-6 flex flex-col justify-between min-h-[210px] ${f.accent || "bg-white border-zinc-200" } ${i===4 ? "!border-zinc-800" : ""}`}>
              <div>
                <div className="w-9 h-9 rounded-full bg-zinc-900 text-white md:bg-white md:text-zinc-900 md:border flex items-center justify-center text-[16px] font-mono" style={i===4?{background:"#1A1F29", borderColor:"rgba(255,255,255,0.1)", color:"white"}:{}}>{f.icon}</div>
                <div className="mt-4 font-en font-semibold text-[16px] tracking-tight">{f.k}</div>
                <div className={`font-bn font-medium text-[14px] mt-0.5 ${i===4?"text-white/80":"text-[#0E7C3A]"}`}>{f.bn}</div>
                <div className={`font-bn text-[13.5px] leading-[1.6] mt-2 ${i===4?"text-zinc-400":"text-zinc-600"}`}>{f.desc}</div>
              </div>
              {i===4 && <div className="mt-4 font-mono text-[11px] text-emerald-300 bg-white/5 border border-white/10 rounded-full inline-flex px-3 py-1 self-start">arafat.hostamar.dev → Live ✓</div>}
              {i===2 && <div className="mt-4 h-1.5 rounded-full bg-zinc-100 overflow-hidden"><div className="h-full w-[82%] bg-[#0E7C3A]"/></div>}
            </div>
          ))}
        </div>
      </section>

      {/* Use cases */}
      <section className="bg-white border-y border-zinc-200">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-12 md:py-16">
          <h3 className="font-bn font-bold text-[22px] md:text-[28px]">কার জন্য Hostamar /dev?</h3>
          <div className="grid md:grid-cols-3 gap-5 mt-6">
            {[
              {t:"Student CSE", bn:"ভার্সিটির ল্যাবে ইনস্টল ছাড়া কোড প্র্যাকটিস", d:"Lab PC তে admin permission নেই? ব্রাউজার ওপেন করেই Python, C++, Next.js প্র্যাকটিস। Assignment GitHub এ push।", tag:"No install"},
              {t:"Freelancer", bn:"ক্লায়েন্টের বাগ ফিক্স করতে দ্রুত ব্রাউজারে ওপেন", d:"ক্লায়েন্ট zip পাঠালো, VS Code ওপেন করতে 5 মিনিট। Hostamar এ drag-drop, AI দিয়ে bug খুঁজে 30s এ ফিক্স।", tag:"Fast fix"},
              {t:"Startup", bn:"Idea থেকে deploy 5 মিনিটে", d:"ল্যান্ডিং পেজ কোড করুন, AI দিয়ে কন্টেন্ট, এক ক্লিকে hostamar.dev লাইভ। তারপর bKash দিয়ে ডোমেইন কিনুন।", tag:"Idea→Live"},
            ].map(c=>(
              <div key={c.t} className="rounded-2xl border border-zinc-200 bg-[#FCFCF9] p-6">
                <div className="inline-flex font-en text-[11px] tracking-wide px-2.5 py-1 rounded-full bg-zinc-900 text-white">{c.tag}</div>
                <div className="font-en font-semibold mt-3">{c.t}</div>
                <div className="font-bn font-medium text-[#0E7C3A] text-[14px] mt-1">{c.bn}</div>
                <div className="font-bn text-[13.5px] leading-[1.65] text-zinc-600 mt-2">{c.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="max-w-[1200px] mx-auto px-4 md:px-6 py-12 md:py-16">
        <div className="flex items-baseline justify-between flex-wrap gap-3">
          <h3 className="font-bn font-bold text-[22px] md:text-[28px]">কেন Hostamar? দামে আর ফিচারে এগিয়ে</h3>
          <span className="font-en text-xs text-zinc-500">Billed monthly • bKash / Nagad supported</span>
        </div>
        <div className="mt-6 rounded-[16px] border border-zinc-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-[13px] font-en">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500 text-[11px] tracking-widest">
                <th className="text-left font-medium p-4">FEATURE</th>
                <th className="text-left font-medium p-4">GitHub Codespaces</th>
                <th className="text-left font-medium p-4">Cursor</th>
                <th className="text-left font-medium p-4">Replit</th>
                <th className="text-left font-medium p-4 bg-[#0E7C3A]/10 text-[#0E7C3A]">Hostamar /dev ★</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {[
                ["Price / month","$18","$20","$25","৳0 free, ৳1000 থেকে শুরু"],
                ["Free hours","60h","Limited","Limited","Unlimited free tier* (10h fair use)"],
                ["Bangla UI + bKash","✕","✕","✕","✓ Bangla, bKash, Nagad"],
                ["Deploy Dhaka CDN","✕ Global","✕","✕","✓ Dhaka edge + free SSL"],
                ["BD Support","✕","✕","✕","✓ Messenger, 9am-11pm"],
                ["Python pandas in browser","✕","✕","Partial","✓ Pyodide"],
              ].map((r,i)=>(
                <tr key={i} className={i===3?"bg-[#0E7C3A]/[0.03]":""}>
                  <td className="p-4 font-medium text-zinc-800">{r[0]}</td>
                  <td className="p-4 text-zinc-600">{r[1]}</td>
                  <td className="p-4 text-zinc-600">{r[2]}</td>
                  <td className="p-4 text-zinc-600">{r[3]}</td>
                  <td className="p-4 font-semibold bg-[#0E7C3A]/[0.06] text-[#0E7C3A]">{r[4]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
        <div className="font-bn text-[12px] text-zinc-500 mt-3">* Free tier 10h/month, community support। Abuse protection এর জন্য fair-use limit।</div>
      </section>

      {/* How it works */}
      <section id="deploy" className="bg-[#0F1115] text-white rounded-t-[28px] md:rounded-t-[36px] overflow-hidden">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-12 md:py-20">
          <div className="grid md:grid-cols-[1.1fr_1.9fr] gap-10 items-start">
            <div>
              <div className="font-en text-[11px] tracking-[0.18em] text-white/50">HOW IT WORKS</div>
              <h3 className="font-bn font-bold text-[28px] md:text-[36px] leading-[1.15] mt-3">৩ স্টেপে লাইভ</h3>
              <p className="font-bn text-[14px] leading-relaxed text-white/60 mt-3 max-w-[320px]">Install নেই, Docker নেই। শুধু ব্রাউজার।</p>
              <div className="mt-8 hidden md:block">
                <div className="font-mono text-[11px] text-white/40">LIVE LOG</div>
                <div className="mt-3 rounded-xl bg-white/[0.06] border border-white/10 p-4 font-mono text-[11px] leading-6 text-zinc-300">
                  <div>$ hostamar deploy</div>
                  <div className="text-emerald-400">✔ build completed in 1.8s</div>
                  <div className="text-sky-300">↗ https://shop.hostamar.dev</div>
                  <div className="text-white/40">SSL ✓ CDN ✓ Dhaka</div>
                </div>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                {n:"01", t:"GitHub import বা New Project", bn:"Next.js, Python, Blank টেমপ্লেট", code:"npx create-hostamar@latest\n→ nextjs / python-fastapi / blank"},
                {n:"02", t:"Code with AI", bn:"Bangla কমেন্ট লিখুন, কোড পান", code:"// প্রোডাক্ট কার্ড বানাও\nAI → <ProductCard />\nTab to accept"},
                {n:"03", t:"Deploy → Live URL", bn:"এক ক্লিকে hostamar.dev", code:"Deploy\n→ arafat.hostamar.dev\nlive in 2s • free SSL"},
              ].map(s=>(
                <div key={s.n} className="rounded-2xl bg-white/[0.06] border border-white/10 p-5 backdrop-blur">
                  <div className="font-mono text-[12px] text-[#0E7C3A] bg-[#0E7C3A]/20 inline-flex px-2 py-0.5 rounded-full">{s.n}</div>
                  <div className="font-bn font-semibold text-[16px] mt-3 leading-tight">{s.t}</div>
                  <div className="font-bn text-[13px] text-white/60 mt-1">{s.bn}</div>
                  <pre className="mt-4 font-mono text-[11px] leading-[1.7] text-zinc-300 whitespace-pre-wrap bg-black/30 rounded-xl p-3 border border-white/10">{s.code}</pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-[1200px] mx-auto px-4 md:px-6 py-12 md:py-20">
        <div className="text-center max-w-[560px] mx-auto">
          <h3 className="font-bn font-bold text-[28px] md:text-[40px] leading-tight">সহজ প্রাইসিং, bKash এ পে</h3>
          <p className="font-bn text-[14px] text-zinc-600 mt-2">ফ্রি তে শুরু করুন, গ্রো করলে আপগ্রেড। কোনো ডলার কার্ড লাগবে না।</p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mt-10 items-stretch">
          {/* Free */}
          <div className="rounded-[20px] border border-zinc-200 bg-white p-6 flex flex-col">
            <div className="font-en font-semibold">Free</div>
            <div className="font-bn text-[13px] text-zinc-500 mt-1">শেখার জন্য পারফেক্ট</div>
            <div className="mt-4 flex items-baseline gap-1"><span className="font-en font-bold text-[32px]">৳0</span><span className="font-en text-zinc-500 text-sm">/mo</span></div>
            <ul className="mt-5 space-y-2.5 font-bn text-[13.5px] text-zinc-700">
              <li>✓ 10 hours / month</li><li>✓ 2GB RAM</li><li>✓ 1 project</li><li>✓ Community support</li>
            </ul>
            <a href="https://hostamar.com/generate" className="mt-auto pt-6 inline-flex h-11 w-full items-center justify-center rounded-full border border-zinc-200 font-en text-sm font-medium hover:bg-zinc-50">ফ্রি শুরু করুন</a>
          </div>

          {/* Starter */}
          <div className="rounded-[20px] bg-[#0F1115] text-white p-[1px] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.5)]">
            <div className="rounded-[19px] bg-[#15181E] p-6 h-full flex flex-col relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#0E7C3A] to-transparent opacity-60"/>
              <div className="inline-flex self-start px-3 py-1 rounded-full bg-[#0E7C3A] text-white font-en text-[11px] font-bold tracking-wide">MOST POPULAR</div>
              <div className="font-en font-semibold mt-3">Starter</div>
              <div className="font-bn text-[13px] text-white/60 mt-1">ফ্রিল্যান্সার ও স্টুডেন্ট ফেভারিট</div>
              <div className="mt-4 flex items-baseline gap-2"><span className="font-en font-bold text-[34px]">৳2000</span><span className="font-en text-white/50 text-sm">/mo</span></div>
              <div className="font-bn text-[11px] text-white/50 mt-1">Includes Video 10 + Hosting 5GB + Chat + Browser + IDE</div>
              <ul className="mt-5 space-y-2.5 font-bn text-[13.5px] text-white/85">
                <li>✓ 100 hours</li><li>✓ 8GB RAM • 10 projects</li><li>✓ AI unlimited (DeepSeek + CodeLlama)</li><li>✓ Custom domain + Dhaka CDN</li><li>✓ bKash / Nagad auto pay</li>
              </ul>
              <a href="https://hostamar.com/generate" className="mt-auto pt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-[#0E7C3A] text-white font-bn font-semibold hover:bg-[#0c6a32]">Starter নিন — ৳2000/mo</a>
              <div className="font-en text-[11px] text-white/40 text-center mt-2">Cancel anytime • 7-day bKash refund</div>
            </div>
          </div>

          {/* Business */}
          <div className="rounded-[20px] border border-zinc-200 bg-white p-6 flex flex-col">
            <div className="font-en font-semibold">Business</div>
            <div className="font-bn text-[13px] text-zinc-500 mt-1">টিম ও এজেন্সির জন্য</div>
            <div className="mt-4 flex items-baseline gap-1"><span className="font-en font-bold text-[32px]">৳3500</span><span className="font-en text-zinc-500 text-sm">/mo</span></div>
            <ul className="mt-5 space-y-2.5 font-bn text-[13.5px] text-zinc-700">
              <li>✓ Unlimited hours</li><li>✓ 16GB RAM</li><li>✓ Team Live Share + roles</li><li>✓ API access + priority support</li>
            </ul>
            <a href="https://hostamar.com/generate" className="mt-auto pt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-zinc-900 text-white font-en text-sm font-medium hover:bg-black">Contact Sales</a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white border-y border-zinc-200">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-12 md:py-16 grid md:grid-cols-[320px_1fr] gap-8">
          <div>
            <h4 className="font-bn font-bold text-[22px]">প্রশ্ন আছে?</h4>
            <p className="font-bn text-[13.5px] text-zinc-600 mt-2 leading-relaxed">প্রাইভেসি, ডাউনলোড, bKash refund — সব উত্তর এখানে।</p>
            <div className="mt-4 inline-flex font-en text-[12px] px-3 py-1.5 rounded-full bg-zinc-100">support@hostamar.com • 9am-11pm BD</div>
          </div>
          <div className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 overflow-hidden">
            {[
              {q:"আমার কোড কি প্রাইভেট থাকবে?", a:"হ্যাঁ। Free tier এ private repo by default। আমরা কোড ট্রেইনিং এ ব্যবহার করি না। SOC2 compliant infra, Dhaka + SG region।"},
              {q:"প্রজেক্ট ডাউনলোড করতে পারব?", a:"এক ক্লিকে Download ZIP বা `git push` করুন আপনার GitHub এ। কোনো lock-in নেই।"},
              {q:"bKash রিফান্ড পলিসি কি?", a:"7 দিনের মধ্যে 100% refund bKash/Nagad এ। Starter/Business এ auto-renew বন্ধ করতে পারবেন যেকোনো সময়।"},
              {q:"Python pandas, numpy চলবে?", a:"হ্যাঁ। Pyodide এর মাধ্যমে ব্রাউজারে সরাসরি চলে। 200MB+ wheel support, matplotlib plot ও দেখতে পারবেন। Slow হলে Cloud runner এ switch।"},
            ].map((f,i)=>(
              <button key={i} onClick={()=>setFaqOpen(faqOpen===i?null:i)} className="w-full text-left p-5 flex justify-between gap-4 hover:bg-zinc-50 transition">
                <div>
                  <div className="font-bn font-semibold text-[15px]">{f.q}</div>
                  {faqOpen===i && <div className="font-bn text-[13.5px] leading-[1.65] text-zinc-600 mt-2 max-w-[620px]">{f.a}</div>}
                </div>
                <span className={`shrink-0 w-7 h-7 rounded-full border flex items-center justify-center text-sm transition ${faqOpen===i?"bg-zinc-900 text-white border-zinc-900":"bg-white text-zinc-500"}`}>{faqOpen===i?"−":"+"}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-[1200px] mx-auto px-4 md:px-6 py-10 md:py-14">
        <div className="rounded-[24px] md:rounded-[28px] overflow-hidden bg-[#0F1115] border border-white/10 relative">
          <div className="absolute inset-0 bg-[radial-gradient(600px_300px_at_20%_0%,rgba(14,124,58,0.25),transparent),radial-gradient(500px_300px_at_90%_10%,rgba(228,49,43,0.18),transparent)] pointer-events-none"/>
          <div className="relative grid md:grid-cols-[1.2fr_0.8fr] gap-6 p-6 md:p-10 items-center">
            <div>
              <div className="font-mono text-[11px] tracking-widest text-white/40">FINAL DEPLOY</div>
              <h3 className="font-bn font-bold text-[28px] md:text-[40px] leading-[1.1] text-white mt-3">কোড লিখুন, Deploy করুন,<br/><span className="text-[#0E7C3A]">টাকা আয় করুন</span></h3>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="https://hostamar.com/generate" className="inline-flex h-12 px-7 items-center justify-center rounded-full bg-white text-zinc-900 font-bn font-semibold hover:bg-zinc-100">IDE ওপেন করুন →</a>
                <a href="#editor" className="inline-flex h-12 px-7 items-center justify-center rounded-full bg-white/10 text-white border border-white/15 font-en text-sm hover:bg-white/15">API Docs পড়ুন</a>
              </div>
              <div className="mt-4 font-bn text-[12px] text-white/50">কোনো কার্ড লাগবে না • bKash দিয়ে শুরু • 2s এ লাইভ</div>
            </div>
            <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-4 font-mono text-[12px] leading-6">
              <div className="text-white/50">$ hostamar deploy --prod</div>
              <div className="text-emerald-400 mt-1">✔ Build 1.4s • 42 modules</div>
              <div className="text-white">✔ https://arafat.hostamar.dev</div>
              <div className="text-sky-300">✔ SSL • Dhaka CDN • bKash checkout ready</div>
              <div className="mt-4 rounded-xl bg-black/40 border border-white/10 p-3">
                <div className="text-[11px] text-white/40">CROSS-SELL</div>
                <div className="font-bn text-[13px] text-white mt-1 leading-snug">ভিডিওর ল্যান্ডিং পেজ কোড করতে IDE ব্যবহার করুন, তারপর এক ক্লিকে হোস্ট করুন</div>
                <div className="mt-2 flex gap-2"><span className="text-[10px] px-2 py-1 rounded-full bg-[#0E7C3A]/20 text-emerald-300 border border-emerald-500/20">/video → /dev → /hosting</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-[#FCFCF9]">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-10 grid md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-8">
          <div>
            <div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-lg bg-[#0E7C3A] flex items-center justify-center text-white font-mono font-bold">{"</>"}</div><span className="font-en font-extrabold">Hostamar <span className="text-[#0E7C3A]">/dev</span></span></div>
            <div className="font-bn text-[13px] text-zinc-600 mt-3 leading-relaxed max-w-[300px]">বাংলাদেশের ডেভেলপারদের জন্য ব্রাউজার IDE। VS Code, AI, Deploy — সব এক জায়গায়।</div>
            <div className="mt-4 font-en text-[12px] text-zinc-500">© {new Date().getFullYear()} Hostamar. Made in Dhaka 🇧🇩</div>
          </div>
          {[
            {h:"Product", l:[["Editor","#editor"],["Templates","#"],["Deploy","#deploy"],["Pricing","#pricing"]]},
            {h:"Ecosystem", l:[["/hosting","/hosting"],["/chat","/chat"],["/browser","/browser"],["/video","/video"]]},
            {h:"Support", l:[["Docs","#"],["Status 99.9%","#"],["bKash Help","#"],["Contact","#"]]},
          ].map(col=>(
            <div key={col.h}>
              <div className="font-en font-semibold text-[13px] tracking-wide">{col.h}</div>
              <ul className="mt-3 space-y-2">
                {col.l.map(([label,href])=><li key={label}><a href={href} className="font-en text-[13px] text-zinc-600 hover:text-zinc-900">{label}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}
