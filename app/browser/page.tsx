'use client'
import { useState } from "react";
import {
  FileText,
  Youtube,
  Languages,
  MessageCircle,
  ShieldCheck,
  Lock,
  ArrowUpRight,
  Star,
  Check,
  X,
  Play,
  Sparkles,
  Globe,
  Zap,
  ChevronDown,
  ExternalLink,
} from "lucide-react";

export default function App() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mockTab, setMockTab] = useState<"summary" | "youtube" | "sources">("youtube");
  const [chatSent, setChatSent] = useState(false);

  return (
    <div className="min-h-screen bg-[#FCFCF9] text-zinc-900 antialiased selection:bg-[#0E7C3A]/15">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        h1,h2,h3,.font-bangla { font-family: "Hind Siliguri", sans-serif; }
        body, .font-inter { font-family: "Inter", system-ui, sans-serif; }
      `}</style>

      {/* Trust Bar */}
      <div className="w-full bg-zinc-900 text-zinc-100 text-[13px] leading-none">
        <div className="mx-auto max-w-[1180px] px-4 md:px-6 h-9 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 md:gap-6 overflow-hidden">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-medium">৫০০+ ক্রিয়েটর ব্যবহার করছে</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 whitespace-nowrap border-l border-white/15 pl-6">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="font-semibold">৪.৮</span>
              <span className="opacity-70">/ ১২৩ রিভিউ</span>
            </span>
            <span className="hidden md:inline-flex items-center gap-1.5 whitespace-nowrap border-l border-white/15 pl-6">
              <span className="opacity-60">Made in</span>
              <span className="font-semibold tracking-wide">🇧🇩 Bangladesh</span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-[12px] whitespace-nowrap opacity-80">
            <span className="hidden sm:inline">bKash • Nagad • Rocket সাপোর্টেড</span>
            <span className="sm:hidden">bKash ✓</span>
          </div>
        </div>
      </div>

      {/* Header */}
      

      {/* Hero */}
      <section className="mx-auto max-w-[1180px] px-4 md:px-6 pt-10 md:pt-16 pb-12 md:pb-20">
        <div className="grid md:grid-cols-[1.05fr_0.95fr] gap-8 md:gap-12 items-start">
          {/* Left */}
          <div className="pt-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[12px] shadow-sm">
              <span className="inline-flex h-5 px-2 items-center rounded-full bg-[#E4312B] text-white font-bold text-[10px] tracking-wide">NEW</span>
              <span className="font-medium opacity-80">Arc ও Perplexity এর চেয়ে ৭০% হালকা — বাংলাদেশের জন্য তৈরি</span>
            </div>

            <h1 className="font-bangla mt-5 text-[32px] md:text-[48px] leading-[1.1] font-bold tracking-tight text-zinc-900">
              ইংরেজি আর্টিকেল পড়ার সময় নেই?
              <span className="block mt-1 md:mt-2 bg-gradient-to-r from-[#0E7C3A] to-[#0E7C3A]/70 bg-clip-text text-transparent">
                AI পড়ুক, বাংলায় বুঝিয়ে দিক
              </span>
            </h1>

            <p className="mt-4 md:mt-5 text-[16px] md:text-[17px] leading-[1.7] opacity-70 max-w-[520px] font-bangla">
              যেকোনো ওয়েবপেজ, ইউটিউব ভিডিও, PDF থেকে <span className="font-semibold opacity-100">১০ লাইনে বাংলা সারাংশ</span>, প্রশ্ন করুন, সোর্স সহ উত্তর পান। আপনার ব্রাউজারেই, এক ক্লিকে।
            </p>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <a
                href="https://hostamar.com/generate"
                className="h-[48px] inline-flex items-center justify-center gap-2 rounded-full bg-[#0E7C3A] px-6 text-white font-semibold text-[14px] shadow-[0_12px_24px_-10px_rgba(14,124,58,0.6)] hover:brightness-[1.05] transition"
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-white/15">
                  <Zap className="h-3.5 w-3.5" />
                </span>
                Chrome Extension যোগ করুন
              </a>
              <a
                href="https://hostamar.com/generate"
                className="h-[48px] inline-flex items-center justify-center gap-2 rounded-full bg-white border border-zinc-200 px-6 font-semibold text-[14px] hover:bg-zinc-50 transition"
              >
                ওয়েবে ব্যবহার করুন
                <ExternalLink className="h-4 w-4 opacity-60" />
              </a>
            </div>

            <p className="mt-3 text-[12.5px] opacity-60 font-inter flex items-center gap-2">
              <span className="h-px w-6 bg-zinc-300" /> Arc ও Perplexity এর চেয়ে ৭০% হালকা • কোনো ক্রেডিট কার্ড লাগবে না • bKash এ পেমেন্ট
            </p>

            <div className="mt-8 grid grid-cols-3 gap-3 max-w-[420px]">
              {[
                { k: "২০k+", v: "দৈনিক সারাংশ" },
                { k: "১.২s", v: "গড় সারাংশ সময়" },
                { k: "১০০%", v: "প্রাইভেট" },
              ].map((s) => (
                <div key={s.v} className="rounded-2xl bg-white border border-zinc-200/80 p-3.5 shadow-sm">
                  <div className="font-bold text-[18px] leading-none">{s.k}</div>
                  <div className="mt-1 text-[12px] opacity-60 font-bangla">{s.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Browser Mock */}
          <div className="relative w-full max-w-full overflow-hidden rounded-[28px]">
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-100 via-white to-red-50 rounded-[28px] blur-xl opacity-80 pointer-events-none" />
            <div className="rounded-[24px] border border-zinc-200 bg-white shadow-[0_24px_80px_-24px_rgba(0,0,0,0.25),0_8px_24px_-12px_rgba(0,0,0,0.12)] overflow-hidden">
              {/* Window chrome */}
              <div className="h-11 flex items-center gap-2 px-4 border-b border-zinc-100 bg-zinc-50/70">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-[#FF5F57] border border-black/10" />
                  <span className="h-3 w-3 rounded-full bg-[#FFBD2E] border border-black/10" />
                  <span className="h-3 w-3 rounded-full bg-[#28C840] border border-black/10" />
                </div>
                <div className="ml-3 flex-1 flex items-center gap-2 rounded-full bg-white border border-zinc-200 h-7 px-3 text-[12px]">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span className="opacity-60 truncate">nytimes.com / 2024 / climate-future-bangladesh-delta</span>
                  <span className="ml-auto hidden sm:inline-flex items-center gap-1 text-[11px] font-medium bg-zinc-900 text-white rounded-full px-2 h-5">
                    <Sparkles className="h-3 w-3" /> Hostamar AI
                  </span>
                </div>
              </div>

              <div className="grid md:grid-cols-[1fr_300px] min-h-[440px]">
                {/* Article */}
                <div className="p-5 border-r border-zinc-100">
                  <div className="text-[11px] uppercase tracking-widest opacity-50 font-semibold">The New York Times • 6 min read</div>
                  <h3 className="mt-2 font-inter font-bold text-[18px] leading-tight">
                    How Rising Seas Are Reshaping Bangladesh’s Future
                  </h3>
                  <div className="mt-3 h-28 rounded-xl bg-gradient-to-br from-sky-100 via-emerald-50 to-amber-50 border border-zinc-200/60 overflow-hidden relative">
                    <div className="absolute inset-0 opacity-60" style={{backgroundImage:`radial-gradient(circle at 30% 20%, rgba(14,124,58,0.18), transparent 40%), radial-gradient(circle at 80% 80%, rgba(228,49,43,0.12), transparent 40%)`}} />
                    <div className="absolute bottom-2 left-3 text-[11px] font-medium px-2 h-5 rounded-full bg-white/80 backdrop-blur border border-zinc-200 inline-flex items-center">Bangladesh Delta • Climate</div>
                  </div>
                  <div className="mt-4 space-y-2 text-[13px] leading-[1.7] opacity-70">
                    <p>Bangladesh’s low-lying delta makes it one of the most vulnerable countries to climate change...</p>
                    <p className="hidden sm:block">New adaptation models show community-led embankments reducing flood risk by 34%...</p>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <span className="inline-flex h-6 items-center rounded-full bg-zinc-900 text-white px-2.5 text-[11px] font-medium">Summarize</span>
                    <span className="inline-flex h-6 items-center rounded-full border px-2.5 text-[11px]">Translate to বাংলা</span>
                    <span className="inline-flex h-6 items-center rounded-full border px-2.5 text-[11px]">Ask AI</span>
                  </div>
                </div>

                {/* AI Panel */}
                <div className="bg-[#FCFCF9] flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 px-3 h-10 border-b border-zinc-200/70 text-[12px] font-medium shrink-0">
                    <button onClick={()=>setMockTab("summary")} className={`h-6 px-2.5 rounded-full transition ${mockTab==="summary" ? "bg-zinc-900 text-white" : "border border-zinc-200/60 hover:bg-white"}`}>সারাংশ</button>
                    <button onClick={()=>setMockTab("youtube")} className={`h-6 px-2.5 rounded-full transition ${mockTab==="youtube" ? "bg-zinc-900 text-white" : "border border-transparent hover:border-zinc-200 hover:bg-white"}`}>YouTube</button>
                    <button onClick={()=>setMockTab("sources")} className={`h-6 px-2.5 rounded-full transition ${mockTab==="sources" ? "bg-zinc-900 text-white" : "border border-transparent hover:border-zinc-200 hover:bg-white opacity-80"}`}>Sources</button>
                  </div>
                  <div className="p-4 space-y-3 overflow-auto flex-1">
                    {mockTab==="summary" && (
                      <div className="rounded-2xl bg-white border border-zinc-200 p-3.5 shadow-sm">
                        <div className="flex items-center gap-2 text-[11px] font-semibold opacity-60">
                          <Sparkles className="h-3.5 w-3.5 text-[#0E7C3A]" /> বাংলা সারাংশ • ১০ লাইন
                        </div>
                        <ul className="mt-2.5 space-y-2 text-[13px] leading-[1.65] font-bangla">
                          <li className="flex gap-2"><span className="text-[#0E7C3A] mt-[3px]">•</span><span>সমুদ্রপৃষ্ঠ ১ মিটার বাড়লে বাংলাদেশের ১৭% জমি ঝুঁকিতে পড়বে।</span></li>
                          <li className="flex gap-2"><span className="text-[#0E7C3A] mt-[3px]">•</span><span>কমিউনিটি ভিত্তিক বাঁধে বন্যার ক্ষতি ৩৪% কমেছে — গবেষণায় প্রমাণিত।</span></li>
                          <li className="flex gap-2"><span className="text-[#0E7C3A] mt-[3px]">•</span><span>লবণাক্ততা বাড়ায় ধানের ফলন ২২% কমতে পারে ২০৩০ সালের মধ্যে।</span></li>
                        </ul>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {["nytimes.com","IPCC 2024","BWDB data"].map((s)=>(
                            <span key={s} className="inline-flex items-center gap-1 rounded-full bg-zinc-100 border border-zinc-200 px-2 h-5 text-[11px]"><span className="h-1 w-1 rounded-full bg-emerald-500" />{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {mockTab==="youtube" && (
                      <div className="rounded-2xl bg-zinc-900 text-zinc-100 p-3.5">
                        <div className="text-[11px] opacity-60 flex items-center gap-1.5"><Play className="h-3 w-3"/> YouTube Transcript • সক্রিয়</div>
                        <div className="mt-2 text-[13px] leading-[1.6] font-bangla opacity-90">“এই ডেল্টা মডেলটি কীভাবে কাজ করে?” — ভিডিও থেকে টাইমস্ট্যাম্প সহ উত্তর</div>
                        <div className="mt-3 space-y-2 text-[12px]"><div className="flex gap-2"><span className="opacity-50">02:14</span><span>বাঁধের ডিজাইন কিভাবে বন্যা কমায়</span></div><div className="flex gap-2"><span className="opacity-50">04:02</span><span>লবণাক্ততা মোকাবিলায় নতুন ধান</span></div></div>
                        <div className="mt-3 h-8 rounded-full bg-white/10 flex items-center px-3 text-[12px] gap-2"><div className="h-2 w-2 rounded-full bg-red-500 animate-pulse"/><div className="h-1 flex-1 rounded-full bg-white/20"><div className="h-1 w-[42%] rounded-full bg-white"/></div><span className="opacity-60 text-[11px]">02:14 / 08:30</span></div>
                      </div>
                    )}
                    {mockTab==="sources" && (
                      <div className="rounded-2xl bg-white border border-zinc-200 p-3.5 shadow-sm">
                        <div className="text-[11px] font-semibold opacity-60">Sources • ৩টি ভেরিফাইড</div>
                        <div className="mt-2 space-y-2 text-[12px]"><div className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 border">nytimes.com / climate <ExternalLink className="h-3 w-3 opacity-50"/></div><div className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 border">IPCC AR6 WG2 — Asia <ExternalLink className="h-3 w-3 opacity-50"/></div><div className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 border">BWDB Report 2024 <ExternalLink className="h-3 w-3 opacity-50"/></div></div>
                      </div>
                    )}
                    {mockTab!=="summary" && (
                      <div className="rounded-2xl bg-white border border-zinc-200 p-3.5 shadow-sm">
                        <div className="flex items-center gap-2 text-[11px] font-semibold opacity-60"><Sparkles className="h-3.5 w-3.5 text-[#0E7C3A]"/> দ্রুত সারাংশ</div>
                        <p className="mt-1.5 text-[12.5px] leading-[1.6] font-bangla opacity-70">সমুদ্রপৃষ্ঠ বৃদ্ধিতে ডেল্টা ঝুঁকি, কমিউনিটি সমাধান ৩৪% কার্যকর।</p>
                      </div>
                    )}
                    {mockTab==="summary" && (
                      <div className="rounded-2xl bg-zinc-900 text-zinc-100 p-3.5"><div className="text-[11px] opacity-60 flex items-center gap-1.5"><Play className="h-3 w-3"/> YouTube Transcript</div><div className="mt-2 text-[13px] leading-[1.6] font-bangla opacity-90">“এই ডেল্টা মডেলটি কীভাবে কাজ করে?”</div><div className="mt-2 h-8 rounded-full bg-white/10 flex items-center px-3 text-[12px] gap-2"><div className="h-2 w-2 rounded-full bg-red-500"/><div className="h-1 flex-1 rounded-full bg-white/20"><div className="h-1 w-[42%] rounded-full bg-white"/></div><span className="opacity-60 text-[11px]">02:14</span></div></div>
                    )}
                  </div>

                  <div className="mt-auto p-3 border-t border-zinc-200 bg-white/70 backdrop-blur">
                    <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white h-10 px-3 shadow-sm">
                      <MessageCircle className="h-4 w-4 opacity-50 shrink-0" />
                      <input
                        placeholder="এই আর্টিকেলের মূল পয়েন্ট কি?"
                        className="flex-1 bg-transparent outline-none text-[13px] placeholder:opacity-50 font-bangla"
                      />
                      <button aria-label="Send question" onClick={()=>setChatSent(true)} className="h-7 w-7 grid place-items-center rounded-full bg-[#0E7C3A] text-white hover:brightness-110 transition">
                        <ArrowUpRight className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 text-[10.5px] opacity-50 text-center font-bangla">{chatSent ? "✓ প্রশ্ন পাঠানো হয়েছে — ডেমো মোডে সোর্স সহ উত্তর আসবে" : "সোর্স সহ উত্তর • আপনার ডেটা কখনো ট্রেনিংয়ে যায় না"}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-white border border-zinc-200 px-3 py-1.5 text-[11px] shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Local Ollama • Offline সারাংশ উপলব্ধ
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-[1180px] px-4 md:px-6 pb-16">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-[26px] md:text-[34px] font-bold leading-tight tracking-tight">এক ব্রাউজারে সব — বাংলা-ফার্স্ট AI</h2>
            <p className="mt-2 text-[14px] leading-[1.6] opacity-60 max-w-[560px] font-bangla">
              Arc এর ডিজাইন, Perplexity এর বুদ্ধিমত্তা, কিন্তু বাংলাদেশের ভাষা, পেমেন্ট আর প্রাইভেসি নিয়ে তৈরি।
            </p>
          </div>
          <div className="text-[12px] opacity-60 font-medium inline-flex items-center gap-2">
            <span className="h-px w-10 bg-zinc-300 hidden sm:block" /> Powered by HF Inference + NLLB-200 + Whisper
          </div>
        </div>

        <div className="grid md:grid-cols-12 gap-4">
          {/* Card 1 */}
          <div className="md:col-span-7 rounded-[22px] bg-white border border-zinc-200 p-6 shadow-[0_8px_24px_-16px_rgba(0,0,0,0.25)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[220px] h-[220px] bg-gradient-to-br from-emerald-100 to-transparent rounded-full blur-2xl" />
            <div className="flex items-start justify-between gap-4 relative">
              <div>
                <div className="h-9 w-9 rounded-xl bg-[#0E7C3A]/10 text-[#0E7C3A] grid place-items-center">
                  <FileText className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-bold text-[18px] leading-tight font-bangla">URL → বাংলা সারাংশ</h3>
                <p className="mt-1.5 text-[13px] leading-[1.6] opacity-65 max-w-[320px] font-bangla">যেকোনো লিংক পেস্ট করুন, ১০ লাইনে পরিষ্কার বাংলা সারাংশ, কী পয়েন্ট ও সোর্স লিংক সহ।</p>
              </div>
              <span className="hidden sm:inline-flex text-[11px] font-medium px-2.5 h-6 items-center rounded-full bg-zinc-900 text-white">HF Inference</span>
            </div>
            <div className="mt-5 rounded-2xl bg-[#FCFCF9] border border-zinc-200 p-3 flex items-center gap-3">
              <div className="h-9 flex-1 rounded-xl bg-white border border-zinc-200 px-3 flex items-center text-[13px] opacity-70 truncate">https://arxiv.org/abs/2408.....</div>
              <div className="h-9 px-4 rounded-xl bg-zinc-900 text-white grid place-items-center text-[13px] font-semibold">সারাংশ করুন</div>
            </div>
            <div className="mt-3 text-[11px] opacity-50">NLLB-200 • ২০০+ ভাষা থেকে বাংলা, সোর্স-গ্রাউন্ডেড</div>
          </div>

          {/* Card 2 */}
          <div className="md:col-span-5 rounded-[22px] bg-zinc-900 text-zinc-100 p-6 relative overflow-hidden">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#E4312B]/20 blur-2xl" />
            <div className="h-9 w-9 rounded-xl bg-white/10 grid place-items-center">
              <Youtube className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-bold text-[18px] font-bangla">YouTube Transcript + বাংলা সারাংশ</h3>
            <p className="mt-1.5 text-[13px] leading-[1.6] opacity-70 font-bangla">২ ঘণ্টার ভিডিও ২ মিনিটে বুঝুন। অটো ট্রান্সক্রিপ্ট, টাইমস্ট্যাম্প সহ সারাংশ।</p>
            <div className="mt-5 rounded-xl bg-white/10 border border-white/10 p-3 flex items-center gap-3">
              <div className="h-10 w-16 rounded-lg bg-white/15 grid place-items-center">
                <Play className="h-4 w-4" />
              </div>
              <div className="text-[12px] leading-tight">
                <div className="font-semibold">Transcript extracted</div>
                <div className="opacity-60">08:30 • 1,240 words → ৯ লাইন সারাংশ</div>
              </div>
              <div className="ml-auto h-6 px-2.5 rounded-full bg-white text-zinc-900 text-[11px] font-semibold grid place-items-center">বাংলায় দেখুন</div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="md:col-span-4 rounded-[22px] bg-white border border-zinc-200 p-6 shadow-sm">
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 grid place-items-center">
              <Languages className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-bold text-[16px] font-bangla">ফুল পেজ বাংলা ট্রান্সলেশন</h3>
            <p className="mt-1.5 text-[13px] leading-[1.6] opacity-65 font-bangla">গুগল ট্রান্সলেটের চেয়ে প্রাকৃতিক। লেআউট ভাঙে না, কোড ব্লক অক্ষত থাকে।</p>
            <div className="mt-4 flex gap-2 text-[11px]">
              <span className="px-2.5 h-6 rounded-full bg-zinc-100 border">Original</span>
              <span className="px-2.5 h-6 rounded-full bg-[#0E7C3A] text-white">বাংলা ✓</span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="md:col-span-4 rounded-[22px] bg-white border border-zinc-200 p-6 shadow-sm">
            <div className="h-9 w-9 rounded-xl bg-violet-50 text-violet-600 grid place-items-center">
              <MessageCircle className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-bold text-[16px] font-bangla">AI Chat with Page</h3>
            <p className="mt-1.5 text-[13px] leading-[1.6] opacity-65 font-bangla">পেজ নিয়ে প্রশ্ন করুন — সোর্স হাইলাইট সহ উত্তর, ভুল তথ্য নয়।</p>
            <div className="mt-4 rounded-xl bg-zinc-50 border border-zinc-200 p-2.5 text-[12px] font-bangla">
              <div className="opacity-60">আপনি:</div>
              <div className="font-medium">এই পেপারের limitation কী?</div>
              <div className="mt-2 rounded-lg bg-white border p-2">৩টি limitation, পেজ ৪-৫ থেকে — সোর্স দেখুন ↗</div>
            </div>
          </div>

          {/* Card 5 & 6 */}
          <div className="md:col-span-4 grid gap-4">
            <div className="rounded-[22px] bg-white border border-zinc-200 p-5 shadow-sm flex gap-3">
              <div className="h-9 w-9 shrink-0 rounded-xl bg-amber-50 text-amber-600 grid place-items-center">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-[15px] font-bangla">Ad Blocker + Fast</h3>
                <p className="mt-1 text-[12.5px] leading-[1.6] opacity-65 font-bangla">বাংলাদেশি অ্যাড নেটওয়ার্ক ব্লক, পেজ লোড ৩× দ্রুত।</p>
              </div>
            </div>
            <div className="rounded-[22px] bg-white border border-zinc-200 p-5 shadow-sm flex gap-3">
              <div className="h-9 w-9 shrink-0 rounded-xl bg-emerald-50 text-emerald-700 grid place-items-center">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-[15px] font-bangla">Private — ডেটা বিক্রি হয় না</h3>
                <p className="mt-1 text-[12.5px] leading-[1.6] opacity-65 font-bangla">Local Ollama option, history আপনার ডিভাইসেই।</p>
                <div className="mt-2 inline-flex text-[10px] font-semibold px-2 h-5 items-center rounded-full bg-zinc-900 text-white">Zero tracking</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section id="usecases" className="bg-white border-y border-zinc-200">
        <div className="mx-auto max-w-[1180px] px-4 md:px-6 py-14 md:py-16">
          <h2 className="text-[24px] md:text-[30px] font-bold tracking-tight">কে কীভাবে ব্যবহার করছে?</h2>
          <div className="mt-8 grid md:grid-cols-3 gap-4">
            {[
              {
                k: "Student",
                title: "Research paper থেকে সারাংশ",
                desc: "১০ পৃষ্ঠার পেপার ১০ লাইনে। কঠিন টার্ম বাংলায় সহজ ব্যাখ্যা, রেফারেন্স সহ।",
                points: ["PDF → বাংলা নোট", "Citation auto extract", "Exam Q&A generate"],
                icon: FileText,
                accent: "from-emerald-50 to-white",
              },
              {
                k: "Freelancer",
                title: "ক্লায়েন্টের ইংরেজি ব্রিফ বাংলায় বোঝা",
                desc: "Upwork/Fiverr ব্রিফ, Notion ডক — এক ক্লিকে বাংলায়, টাস্ক লিস্ট বানিয়ে দেয়।",
                points: ["Brief → টাস্ক ব্রেকডাউন", "ইমেইল ড্রাফট বাংলায়", "Proposal helper"],
                icon: MessageCircle,
                accent: "from-blue-50 to-white",
              },
              {
                k: "SME Owner",
                title: "প্রতিযোগীর ওয়েবসাইট থেকে আইডিয়া",
                desc: "Daraz, competitor site analyze করে প্রাইস, USP, কন্টেন্ট আইডিয়া বের করে।",
                points: ["Competitor → SWOT", "প্রোডাক্ট ডেসক্রিপশন", "FB ad copy বাংলা"],
                icon: Globe,
                accent: "from-amber-50 to-white",
              },
            ].map((c) => (
              <div key={c.k} className={`rounded-[22px] border border-zinc-200 p-6 bg-gradient-to-b ${c.accent} shadow-sm`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] tracking-widest font-semibold opacity-50 uppercase">{c.k}</span>
                  <span className="h-7 w-7 rounded-full bg-zinc-900 text-white grid place-items-center">
                    <c.icon className="h-3.5 w-3.5" />
                  </span>
                </div>
                <h3 className="mt-3 font-bold text-[17px] leading-tight font-bangla">{c.title}</h3>
                <p className="mt-2 text-[13px] leading-[1.6] opacity-65 font-bangla">{c.desc}</p>
                <ul className="mt-4 space-y-2">
                  {c.points.map((p) => (
                    <li key={p} className="flex items-center gap-2 text-[13px]">
                      <span className="h-5 w-5 rounded-full bg-white border grid place-items-center">
                        <Check className="h-3 w-3" />
                      </span>
                      <span className="font-bangla opacity-80">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section id="compare" className="mx-auto max-w-[1180px] px-4 md:px-6 py-14 w-full max-w-full overflow-x-hidden">
        <div className="rounded-[28px] border border-zinc-200 bg-white shadow-sm overflow-hidden w-full">
          <div className="grid md:grid-cols-[1.1fr_1.9fr] w-full">
            <div className="p-7 md:p-8 bg-zinc-50/70 border-b md:border-b-0 md:border-r border-zinc-200">
              <h3 className="font-bold text-[20px] leading-tight">কেন Hostamar Browser?</h3>
              <p className="mt-2 text-[13px] leading-[1.6] opacity-65 font-bangla">Arc সুন্দর, Perplexity স্মার্ট — কিন্তু বাংলায়, bKash এ, বাংলাদেশের ডেটা নিয়ে কেউ ভাবেনি। আমরা ভেবেছি।</p>
              <div className="mt-6 space-y-2 text-[13px]">
                <div className="flex gap-2"><Check className="h-4 w-4 text-emerald-600 mt-0.5" /> ৭০% হালকা, RAM ৪০% কম খায়</div>
                <div className="flex gap-2"><Check className="h-4 w-4 text-emerald-600 mt-0.5" /> বাংলা সারাংশে NLLB-200 ফাইন-টিউন</div>
                <div className="flex gap-2"><Check className="h-4 w-4 text-emerald-600 mt-0.5" /> লোকাল সার্ভার — BDIX স্পিড</div>
              </div>
            </div>
            <div className="w-full max-w-full overflow-x-auto">
              <table className="w-full text-[13px] min-w-[520px] md:min-w-0">
                <thead>
                  <tr className="border-b border-zinc-200 text-[12px] uppercase tracking-wide opacity-60">
                    <th className="text-left font-semibold p-4">Feature</th>
                    <th className="text-left font-semibold p-4">Arc / Perplexity Pro $20</th>
                    <th className="text-left font-semibold p-4 bg-emerald-50/60">Hostamar ৳0-৳২০০০</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {[
                    ["বাংলা সারাংশ", "দুর্বল / নেই", "✅ ১০ লাইন, সোর্স সহ"],
                    ["YouTube → বাংলা", "ইংরেজি শুধু", "✅ ট্রান্সক্রিপ্ট + সারাংশ"],
                    ["bKash / Nagad পেমেন্ট", "❌ কার্ড লাগে", "✅ bKash, Nagad, Rocket"],
                    ["ডেটা প্রাইভেসি", "US সার্ভার", "✅ Local + Ollama option"],
                    ["বাংলাদেশি অ্যাড ব্লক", "❌", "✅ BD ad network ব্লক"],
                    ["দাম", "$20 / মাস", "৳0 ফ্রি, ৳২০০০ এ সব"],
                  ].map((r) => (
                    <tr key={r[0]} className="hover:bg-zinc-50/60">
                      <td className="p-4 font-medium font-bangla">{r[0]}</td>
                      <td className="p-4 opacity-70">{r[1].includes("❌") || r[1].includes("দুর্বল") ? <span className="inline-flex items-center gap-1"><X className="h-3.5 w-3.5 text-zinc-400" />{r[1]}</span> : r[1]}</td>
                      <td className="p-4 bg-emerald-50/40 font-medium">{r[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-[1180px] px-4 md:px-6 pb-16">
        <div className="text-center max-w-[640px] mx-auto">
          <h2 className="text-[28px] md:text-[36px] font-bold tracking-tight leading-tight">সহজ প্রাইসিং, bKash এ পেমেন্ট</h2>
          <p className="mt-3 text-[14px] opacity-60 font-bangla">ফ্রি তে শুরু করুন, প্রয়োজনে আপগ্রেড করুন। কোনো হিডেন ফি নেই।</p>
        </div>

        <div className="mt-8 grid md:grid-cols-3 gap-4 items-start">
          {/* Free */}
          <div className="rounded-[24px] border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="font-bold">Free</h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-[32px] font-bold leading-none">৳০</span>
              <span className="opacity-60 text-[13px]">/ মাস</span>
            </div>
            <p className="mt-2 text-[13px] opacity-65 font-bangla">Unlimited browsing + ২০ AI সারাংশ/দিন</p>
            <ul className="mt-5 space-y-2.5 text-[13px]">
              {["Ad Blocker + Fast", "ফুল পেজ বাংলা ট্রান্সলেশন", "20 summaries / day", "Community support"].map((f) => (
                <li key={f} className="flex gap-2"><Check className="h-4 w-4 text-emerald-600 mt-0.5" /><span>{f}</span></li>
              ))}
            </ul>
            <a href="https://hostamar.com/generate" className="mt-6 h-11 w-full rounded-full border border-zinc-200 grid place-items-center font-semibold text-[14px] hover:bg-zinc-50">
              ফ্রি শুরু করুন
            </a>
          </div>

          {/* Starter */}
          <div className="rounded-[24px] border-2 border-[#0E7C3A] bg-white p-6 shadow-[0_16px_40px_-16px_rgba(14,124,58,0.35)] relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="inline-flex h-6 px-3 items-center rounded-full bg-[#0E7C3A] text-white text-[11px] font-bold tracking-wide">MOST POPULAR</span>
            </div>
            <h3 className="font-bold flex items-center gap-2">Starter <Sparkles className="h-4 w-4 text-amber-500" /></h3>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-[32px] font-bold leading-none">৳২০০০</span>
              <span className="opacity-60 text-[13px]">/ মাস</span>
              <span className="ml-2 text-[11px] font-semibold px-2 h-5 rounded-full bg-amber-100 border border-amber-200 grid place-items-center">৳0 Browser included</span>
            </div>
            <p className="mt-2 text-[13px] opacity-70 font-bangla">Unlimited summaries + YouTube + PDF — সাথে Video + Hosting + Chat</p>
            <ul className="mt-5 space-y-2.5 text-[13px]">
              {["Unlimited বাংলা সারাংশ", "YouTube + PDF + Docs", "AI Chat with Page", "Video + Hosting + Chat included", "bKash / Nagad / Rocket", "Priority BDIX support"].map((f) => (
                <li key={f} className="flex gap-2"><span className="h-5 w-5 rounded-full bg-emerald-50 text-emerald-700 grid place-items-center"><Check className="h-3 w-3" /></span><span className="font-medium">{f}</span></li>
              ))}
            </ul>
            <a href="https://hostamar.com/generate" className="mt-6 h-11 w-full rounded-full bg-[#0E7C3A] text-white grid place-items-center font-semibold text-[14px] shadow-[0_10px_20px_-10px_rgba(14,124,58,0.6)] hover:brightness-105">
              Starter নিন — ৳২০০০
            </a>
            <div className="mt-3 text-[11px] text-center opacity-60">bKash • Nagad • Rocket • ৭ দিনের রিফান্ড</div>
          </div>

          {/* Business */}
          <div className="rounded-[24px] border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="font-bold">Business</h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-[32px] font-bold leading-none">৳৩৫০০</span>
              <span className="opacity-60 text-[13px]">/ মাস</span>
            </div>
            <p className="mt-2 text-[13px] opacity-65">Team + API + সবকিছু Unlimited</p>
            <ul className="mt-5 space-y-2.5 text-[13px]">
              {["Starter এর সবকিছু", "Team ৫ জন", "API access + Webhook", "Custom NLLB fine-tune", "Dedicated support"].map((f) => (
                <li key={f} className="flex gap-2"><Check className="h-4 w-4 text-zinc-500 mt-0.5" /><span>{f}</span></li>
              ))}
            </ul>
            <a href="https://hostamar.com/generate" className="mt-6 h-11 w-full rounded-full bg-zinc-900 text-white grid place-items-center font-semibold text-[14px] hover:bg-black">
              Business শুরু করুন
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-zinc-50 border-y border-zinc-200">
        <div className="mx-auto max-w-[1180px] px-4 md:px-6 py-14 grid md:grid-cols-[320px_1fr] gap-8">
          <div>
            <h2 className="text-[22px] font-bold leading-tight">প্রশ্ন আছে?</h2>
            <p className="mt-2 text-[13px] opacity-60 font-bangla">সবচেয়ে বেশি জিজ্ঞাসিত প্রশ্নের উত্তর।</p>
            <div className="mt-6 rounded-2xl bg-white border border-zinc-200 p-4 text-[12px] leading-[1.6]">
              <div className="font-semibold">bKash রিফান্ড কিভাবে?</div>
              <div className="opacity-70 mt-1 font-bangla">৭ দিনের মধ্যে সাপোর্টে জানালেই bKash/Nagad এ ফেরত। কোনো প্রশ্ন ছাড়া।</div>
            </div>
          </div>
          <div className="space-y-3">
            {[
              {
                q: "Does it work on mobile? মোবাইলে কাজ করে?",
                a: "হ্যাঁ। Android এ Hostamar Browser APK, iOS এ Safari extension। মোবাইলেও একই বাংলা সারাংশ, YouTube transcript, Ad block। Desktop sync শীঘ্রই আসছে।",
              },
              {
                q: "Is my browsing history private? আমার হিস্ট্রি কি নিরাপদ?",
                a: "১০০%। আমরা আপনার ব্রাউজিং হিস্ট্রি কখনো বিক্রি করি না, ট্রেনিংয়ে ব্যবহার করি না। চাইলে Local Ollama মোড — সবকিছু আপনার ডিভাইসেই থাকবে, কোনো সার্ভারে যাবে না।",
              },
              {
                q: "bKash refund policy কী?",
                a: "Starter/Business প্ল্যানে ৭ দিনের মানি-ব্যাক গ্যারান্টি। bKash, Nagad, Rocket — যেভাবে পেমেন্ট করেছেন সেভাবেই ফেরত পাবেন ২৪ ঘণ্টার মধ্যে। support@hostamar.com এ মেইল করুন।",
              },
              {
                q: "Perplexity/Arc থেকে কী আলাদা?",
                a: "Perplexity ইংরেজি-ফার্স্ট, $20, কার্ড লাগে। Arc ডিজাইন সুন্দর কিন্তু বাংলা বোঝে না। Hostamar বাংলা-ফার্স্ট, bKash সাপোর্ট, BD ad block, লোকাল সার্ভার, এবং ৭০% হালকা।",
              },
            ].map((f, i) => (
              <div key={i} className="rounded-2xl bg-white border border-zinc-200">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-4 text-left">
                  <span className="font-semibold text-[14px] pr-6">{f.q}</span>
                  <span className={`h-7 w-7 rounded-full border grid place-items-center shrink-0 transition ${openFaq === i ? "bg-zinc-900 text-white border-zinc-900 rotate-180" : "bg-white"}`}>
                    <ChevronDown className="h-4 w-4" />
                  </span>
                </button>
                {openFaq === i && <div className="px-4 pb-4 text-[13px] leading-[1.7] opacity-70 font-bangla">{f.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-[1180px] px-4 md:px-6 py-12">
        <div className="rounded-[28px] bg-zinc-900 text-zinc-100 p-7 md:p-10 relative overflow-hidden">
          <div className="absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full bg-[#0E7C3A]/30 blur-[80px]" />
          <div className="absolute -left-24 -bottom-24 h-[360px] w-[360px] rounded-full bg-[#E4312B]/20 blur-[80px]" />
          <div className="relative grid md:grid-cols-[1.2fr_0.8fr] gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-3 py-1 text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live • 500+ creators using now
              </div>
              <h2 className="mt-4 text-[28px] md:text-[38px] font-bold leading-[1.1] tracking-tight font-bangla">
                ব্রাউজ করুন, AI সারাংশ পান —<br /> এখনই শুরু করুন
              </h2>
              <p className="mt-3 text-[14px] leading-[1.6] opacity-70 max-w-[460px] font-bangla">ইংরেজি আর্টিকেল, YouTube, PDF — সব বাংলায়। কোনো কার্ড লাগবে না।</p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <a href="https://hostamar.com/generate" className="h-11 px-6 rounded-full bg-white text-zinc-900 font-semibold inline-flex items-center justify-center gap-2">
                  ফ্রি ব্রাউজার ব্যবহার করুন <ArrowUpRight className="h-4 w-4" />
                </a>
                <a href="https://hostamar.com/generate" className="h-11 px-6 rounded-full bg-white/10 border border-white/15 font-medium inline-flex items-center justify-center hover:bg-white/15 transition">
                  Chrome Extension যোগ করুন
                </a>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] opacity-60">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 h-6"><span className="h-3 w-5 rounded-[3px] bg-[#E2136E] grid place-items-center text-[8px] font-bold text-white">bKash</span> সাপোর্টেড</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 h-6">Nagad ✓</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 h-6">Rocket ✓</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 h-6">Made in 🇧🇩</span>
              </div>
            </div>

            <div className="grid gap-3">
              <a href="https://hostamar.com/generate" className="group rounded-2xl bg-white text-zinc-900 p-5 flex items-start justify-between hover:bg-zinc-50 transition">
                <div>
                  <div className="text-[12px] font-semibold opacity-60 uppercase tracking-wide">Cross-sell</div>
                  <div className="mt-1 font-bold text-[15px] font-bangla">সারাংশ থেকে এক ক্লিকে ভিডিও বানান</div>
                  <div className="mt-1 text-[13px] opacity-65">Studio তে যান → Auto voiceover + B-roll</div>
                </div>
                <span className="h-8 w-8 rounded-full bg-zinc-900 text-white grid place-items-center group-hover:translate-x-0.5 transition">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </a>
              <a href="https://hostamar.com/generate" className="group rounded-2xl bg-white/10 border border-white/15 p-5 flex items-start justify-between hover:bg-white/15 transition">
                <div>
                  <div className="text-[12px] font-semibold opacity-60 uppercase tracking-wide">Cross-sell</div>
                  <div className="mt-1 font-bold text-[15px] font-bangla">সারাংশ থেকে ইমেইল লিখুন</div>
                  <div className="mt-1 text-[13px] opacity-70">Chat এ যান → Professional বাংলা/ইংরেজি ইমেইল</div>
                </div>
                <span className="h-8 w-8 rounded-full bg-white text-zinc-900 grid place-items-center">
                  <MessageCircle className="h-4 w-4" />
                </span>
              </a>
              <div className="text-[11px] opacity-50 text-center">Trusted by 500+ creators • 4.8★ rating • Privacy first</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      
    </div>
  );
}
