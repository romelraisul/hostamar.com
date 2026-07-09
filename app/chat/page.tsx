'use client'
import React, { useState } from "react";

const App = () => {
  const [yearly, setYearly] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [mobileNav, setMobileNav] = useState(false);

  const captions = [
    "🔥 শুক্রবার স্পেশাল! ঢাকার সেরা কাচ্চি বিরিয়ানি মাত্র ২৯৯ টাকায়! পরিবার নিয়ে চলে আসুন আজই। #বিরিয়ানিলাভার #ঢাকাফুড",
    "😋 ঘ্রাণেই অর্ধেক খাওয়া শেষ! আমাদের স্পেশাল দম বিরিয়ানি - একবার খেলে বারবার আসবেন। হোম ডেলিভারি চলছে। #ফুডডেলিভারি",
    "✨ আজকের অফার মিস করবেন না! ২টি বিরিয়ানি অর্ডারে ১টি বোরহানি ফ্রি! অর্ডার করতে ইনবক্স করুন। #অফার #বিরিয়ানি",
  ];

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard?.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1600);
  };

  return (
    <div className="min-h-screen bg-[#FCFCF9] text-zinc-900 antialiased selection:bg-[#0E7C3A]/20">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        h1,h2,h3,.font-bn { font-family: "Hind Siliguri", system-ui, sans-serif; }
        body, .font-en { font-family: "Inter", system-ui, sans-serif; }
      `}</style>

      {/* Trust Bar */}
      <div className="w-full bg-zinc-900 text-zinc-100 text-[13px] font-en">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6 h-9 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0E7C3A] animate-pulse" />
              <span className="font-bn font-medium">৫০০+ ক্রিয়েটর Hostamar Chat ব্যবহার করছেন</span>
            </span>
            <span className="hidden sm:inline h-3 w-px bg-white/20" />
            <span className="hidden sm:inline-flex items-center gap-1">
              <span className="text-amber-300">★</span> ৪.৮ রেটিং (১২৪ রিভিউ)
            </span>
          </div>
          <span className="font-bn text-zinc-400 hidden sm:block">বাংলাদেশের জন্য তৈরি • bKash এ পেমেন্ট</span>
          <span className="sm:hidden text-amber-300">★ ৪.৮</span>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#FCFCF9]/80 border-b border-zinc-200/60">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6 h-[68px] flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-[#0E7C3A] text-white grid place-items-center font-bold text-[18px] shadow-sm">হ</div>
              <div className="leading-none">
                <div className="font-bn font-bold text-[18px] tracking-tight">Hostamar</div>
                <div className="font-en text-[11px] font-semibold tracking-widest text-zinc-500 -mt-0.5">CHAT</div>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-7 text-[14px] font-bn font-medium text-zinc-600">
              <a href="#features" className="hover:text-zinc-900 transition">টেমপ্লেট</a>
              <a href="#pricing" className="hover:text-zinc-900 transition">প্রাইসিং</a>
              <a href="#pricing" className="hover:text-zinc-900 transition flex items-center gap-1.5">
                API <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-900 text-white">নতুন</span>
              </a>
            </nav>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <a href="https://hostamar.com/generate" className="font-bn text-[14px] font-medium px-4 py-2 rounded-full hover:bg-zinc-100 transition">লগইন</a>
            <a href="https://hostamar.com/generate" className="font-bn inline-flex items-center justify-center h-10 px-5 rounded-full bg-[#0E7C3A] text-white text-[14px] font-semibold shadow-[0_8px_20px_-12px_#0E7C3A] hover:bg-[#0c6a32] transition">
              ফ্রি চ্যাট শুরু করুন
            </a>
          </div>

          <button onClick={()=>setMobileNav(!mobileNav)} className="md:hidden h-9 w-9 grid place-items-center rounded-xl border border-zinc-200 bg-white">
            <span className="space-y-1 block">
              <span className="block h-0.5 w-4 bg-zinc-800"/><span className="block h-0.5 w-4 bg-zinc-800"/><span className="block h-0.5 w-3 bg-zinc-800"/>
            </span>
          </button>
        </div>
        {mobileNav && (
          <div className="md:hidden border-t border-zinc-200 bg-white px-4 py-4 flex flex-col gap-3">
            <a href="#features" className="font-bn py-2">টেমপ্লেট</a>
            <a href="#pricing" className="font-bn py-2">প্রাইসিং</a>
            <a href="#pricing" className="font-bn py-2">API</a>
            <a href="https://hostamar.com/generate" className="font-bn mt-2 inline-flex h-11 items-center justify-center rounded-full bg-[#0E7C3A] text-white font-semibold">ফ্রি চ্যাট শুরু করুন</a>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-[1180px] px-4 sm:px-6 pt-10 sm:pt-16 pb-8">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-12 items-start">
          {/* Left */}
          <div className="pt-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-zinc-200 shadow-sm text-[12px] font-bn">
              <span className="px-2 py-0.5 rounded-full bg-[#E4312B] text-white font-semibold text-[11px]">নতুন</span>
              GPT-4 ক্লাস মডেল এখন বাংলায়, ভয়েস সহ
            </div>
            <h1 className="font-bn font-bold leading-[0.98] tracking-[-0.03em] text-[38px] sm:text-[56px] lg:text-[64px] mt-6">
              বাংলায় কথা<br />
              বলুন, <span className="relative inline-block">
                <span className="relative z-10 text-[#0E7C3A]">কাজ করিয়ে</span>
                <span className="absolute bottom-1 left-0 right-0 h-3 bg-[#0E7C3A]/15 rounded-full -z-0" />
              </span> নিন
            </h1>
            <p className="font-bn text-[17px] sm:text-[18px] leading-7 text-zinc-600 mt-5 max-w-[520px]">
              GPT-4 ক্লাস মডেল, বাংলা ভয়েস ইনপুট আউটপুট, PDF পড়ে উত্তর দেয়, কোড লেখে। বাংলাদেশি বিজনেসের জন্য বানানো।
            </p>

            <div className="flex flex-wrap gap-3 mt-7">
              <a href="https://hostamar.com/generate" className="font-bn inline-flex items-center gap-2 h-[46px] px-6 rounded-full bg-[#0E7C3A] text-white font-semibold shadow-[0_12px_24px_-14px_#0E7C3A] hover:bg-[#0b5f2e] transition">
                ফ্রি চ্যাট শুরু করুন
                <span className="h-6 w-6 rounded-full bg-white/15 grid place-items-center">→</span>
              </a>
              <a href="#demo" className="font-bn inline-flex h-[46px] px-6 rounded-full bg-white border border-zinc-200 font-medium items-center gap-2 hover:bg-zinc-50 transition">
                <span className="h-5 w-5 rounded-full bg-zinc-900 text-white grid place-items-center text-[10px]">▶</span> ডেমো দেখুন
              </a>
            </div>

            <div className="flex items-center gap-4 mt-8">
              <div className="flex -space-x-2">
                {[1,2,3].map(i=>(
                  <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-zinc-200 grid place-items-center text-[11px] font-bold text-zinc-600"> {String.fromCharCode(64+i)}</div>
                ))}
              </div>
              <p className="font-bn text-[13px] text-zinc-600 leading-5">৫০০+ উদ্যোক্তা প্রতিদিন ব্যবহার করছেন<br className="sm:hidden"/><span className="text-zinc-900 font-medium"> • কোনো কার্ড লাগবে না</span></p>
            </div>
          </div>

          {/* Right Chat Mock */}
          <div id="demo" className="relative">
            <div className="absolute -top-10 -right-10 h-64 w-64 bg-[#0E7C3A]/10 blur-[60px] rounded-full pointer-events-none" />
            <div className="rounded-[28px] bg-white border border-zinc-200 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.18),0_8px_20px_-12px_rgba(0,0,0,0.08)] overflow-hidden">
              {/* Mock header */}
              <div className="h-[56px] px-5 flex items-center justify-between border-b border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-zinc-900 text-white grid place-items-center text-[12px] font-bold">AI</div>
                  <div>
                    <div className="font-bn text-[14px] font-semibold leading-none">Hostamar Chat</div>
                    <div className="font-en text-[11px] text-emerald-600 flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/> অনলাইন • বাংলা বোঝে</div>
                  </div>
                </div>
                <div className="h-7 px-2.5 rounded-full bg-zinc-50 border border-zinc-200 text-[11px] font-medium grid place-items-center">GPT-4 Class</div>
              </div>

              <div className="p-4 sm:p-5 space-y-4 bg-[#FCFCF9]">
                {/* User bubble */}
                <div className="flex justify-end">
                  <div className="max-w-[82%] rounded-[18px] rounded-br-[6px] bg-[#0E7C3A] text-white px-4 py-3 font-bn text-[14px] leading-6 shadow-sm">
                    আমার দোকানের জন্য ফেসবুক ক্যাপশন লিখে দাও - বিরিয়ানি অফার
                    <div className="text-[11px] opacity-70 mt-1 font-en text-right">১২:৪২ PM ✓✓</div>
                  </div>
                </div>

                {/* AI bubble */}
                <div className="flex gap-2.5 items-start">
                  <div className="h-7 w-7 rounded-full bg-zinc-900 text-white grid place-items-center text-[10px] font-bold shrink-0 mt-1">AI</div>
                  <div className="flex-1 space-y-3">
                    <div className="rounded-[18px] rounded-tl-[6px] bg-white border border-zinc-200 px-4 py-3 shadow-sm">
                      <p className="font-bn text-[13px] font-semibold text-zinc-800">আপনার বিরিয়ানি অফারের জন্য ৩টি ক্যাপশন রেডি:</p>
                      <div className="mt-3 space-y-3">
                        {captions.map((c, idx)=>(
                          <div key={idx} className="group rounded-2xl bg-[#FCFCF9] border border-zinc-200 p-3 flex gap-3">
                            <span className="h-6 w-6 rounded-full bg-[#0E7C3A]/10 text-[#0E7C3A] grid place-items-center text-[12px] font-bold shrink-0">{idx+1}</span>
                            <div className="flex-1">
                              <p className="font-bn text-[13.5px] leading-[1.6] text-zinc-700">{c}</p>
                              <div className="mt-2 flex items-center gap-2">
                                <button onClick={()=>handleCopy(c, idx)} className="h-7 px-2.5 rounded-full bg-white border border-zinc-200 text-[11px] font-bn font-medium hover:bg-zinc-50 flex items-center gap-1">
                                  {copiedIdx===idx ? "✓ কপি হয়েছে" : "⎙ কপি করুন"}
                                </button>
                                <span className="text-[11px] text-zinc-400 font-en">{c.length} chars</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* typing indicator */}
                    <div className="inline-flex items-center gap-2 rounded-full bg-white border border-zinc-200 px-3 py-2 shadow-sm">
                      <div className="flex gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.2s]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.1s]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce" />
                      </div>
                      <span className="font-bn text-[12px] text-zinc-500">আরও আইডিয়া লিখছি...</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Input */}
              <div className="p-3 border-t border-zinc-100 bg-white">
                <div className="h-11 rounded-full bg-zinc-50 border border-zinc-200 flex items-center px-3 gap-2">
                  <div className="h-8 w-8 rounded-full bg-white border border-zinc-200 grid place-items-center text-zinc-500">🎤</div>
                  <span className="font-bn text-[13px] text-zinc-400 flex-1">বাংলায় লিখুন বা বলুন...</span>
                  <div className="h-8 w-8 rounded-full bg-[#0E7C3A] text-white grid place-items-center">↑</div>
                </div>
              </div>
            </div>

            {/* floating badge */}
            <div className="absolute -bottom-4 -left-3 sm:left-auto sm:-right-3 bg-zinc-900 text-white rounded-2xl px-3.5 py-2.5 shadow-xl flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-white/10 grid place-items-center">⚡</div>
              <div className="leading-tight">
                <div className="font-bn text-[12px] font-semibold">উত্তর ২ সেকেন্ডে</div>
                <div className="font-en text-[11px] text-white/60">Bengali optimized</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Strip */}
      <section className="mx-auto max-w-[1180px] px-4 sm:px-6 py-6">
        <div className="rounded-[20px] bg-white border border-zinc-200 p-1.5 sm:p-2 flex flex-col sm:flex-row gap-1.5">
          <div className="flex-1 rounded-[14px] bg-zinc-50 border border-zinc-200/70 px-5 py-4 flex items-center justify-between">
            <div>
              <div className="font-en text-[12px] font-semibold tracking-widest text-zinc-500">CHATGPT PLUS</div>
              <div className="font-en font-bold text-[22px] leading-none mt-1">$20<span className="text-[13px] font-medium text-zinc-500">/মাস</span></div>
              <div className="font-en text-[11px] text-zinc-500 mt-1">≈ ২২০০ টাকা • কার্ড লাগবে • ইংরেজি ফোকাস</div>
            </div>
            <div className="h-9 w-9 rounded-full bg-white border border-zinc-200 grid place-items-center text-zinc-400">✕</div>
          </div>

          <div className="flex-1 rounded-[14px] bg-[#0E7C3A] text-white px-5 py-4 flex items-center justify-between shadow-[0_10px_30px_-16px_#0E7C3A] relative overflow-hidden">
            <div className="absolute top-0 right-0 h-24 w-24 bg-white/10 blur-2xl rounded-full" />
            <div className="relative">
              <div className="flex items-center gap-2">
                <span className="font-en text-[12px] font-bold tracking-widest text-white/80">HOSTAMAR CHAT</span>
                <span className="px-2 py-0.5 rounded-full bg-white text-[#0E7C3A] text-[10px] font-bold">৪০% সাশ্রয়</span>
              </div>
              <div className="font-bn font-bold text-[22px] leading-none mt-1">১০০০ টাকা<span className="text-[13px] font-medium text-white/70">/মাস থেকে</span></div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {["bKash","Nagad","Rocket","Upay"].map(b=>(
                  <span key={b} className="px-2 py-0.5 rounded-full bg-white/15 border border-white/15 text-[10px] font-en font-semibold tracking-wide">{b}</span>
                ))}
              </div>
            </div>
            <div className="h-9 w-9 rounded-full bg-white text-[#0E7C3A] grid place-items-center font-bold">✓</div>
          </div>
        </div>
      </section>

      {/* Bento Features */}
      <section id="features" className="mx-auto max-w-[1180px] px-4 sm:px-6 py-10 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <h2 className="font-bn text-[30px] sm:text-[36px] font-bold tracking-tight leading-[1.05]">বাংলা বিজনেসের জন্য<br/>সব ফিচার এক জায়গায়</h2>
          <p className="font-bn text-[14px] text-zinc-600 max-w-[360px]">ভয়েস থেকে PDF, কোড থেকে ফেসবুক পোস্ট — সবকিছু বাংলায়, বাংলাদেশের পেমেন্টে।</p>
        </div>

        <div className="grid md:grid-cols-12 gap-4 auto-rows-[minmax(180px,auto)]">
          <div className="md:col-span-7 rounded-[24px] bg-white border border-zinc-200 p-6 shadow-sm relative overflow-hidden">
            <div className="absolute -right-16 -top-16 h-56 w-56 bg-[#0E7C3A]/10 blur-[30px] rounded-full" />
            <div className="h-10 w-10 rounded-xl bg-[#0E7C3A] text-white grid place-items-center text-[18px]">🎙️</div>
            <h3 className="font-bn font-bold text-[19px] mt-4">বাংলা ভয়েস ইনপুট আউটপুট</h3>
            <p className="font-bn text-[14px] text-zinc-600 mt-1.5 leading-6">মোবাইলে কথা বলুন, AI বাংলায় উত্তর দেবে ভয়েসে। রিকশায় বসেও কন্টেন্ট বানান।</p>
            <div className="mt-5 flex gap-2">
              <span className="px-3 py-1.5 rounded-full bg-zinc-900 text-white text-[12px] font-bn">মোবাইল সাপোর্টেড</span>
              <span className="px-3 py-1.5 rounded-full bg-zinc-100 border border-zinc-200 text-[12px] font-bn">৯৮% একুরেসি</span>
            </div>
          </div>

          <div className="md:col-span-5 rounded-[24px] bg-zinc-900 text-white p-6 relative overflow-hidden">
            <div className="h-10 w-10 rounded-xl bg-white/10 grid place-items-center">📄</div>
            <h3 className="font-bn font-bold text-[19px] mt-4">PDF / Image প্রশ্নোত্তর</h3>
            <p className="font-bn text-[14px] text-white/70 mt-1.5 leading-6">যেকোনো PDF, ছবি, হ্যান্ডনোট আপলোড করুন। Retrieval দিয়ে সঠিক উত্তর।</p>
            <div className="mt-5 rounded-xl bg-white/10 border border-white/10 p-3 font-en text-[12px]">invoice.pdf → "এই মাসের মোট খরচ কত?" → ৳৪২,৫০০</div>
          </div>

          <div className="md:col-span-4 rounded-[24px] bg-white border border-zinc-200 p-6 shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-[#E4312B]/10 text-[#E4312B] grid place-items-center text-[18px]">{"</>"}</div>
            <h3 className="font-bn font-bold text-[17px] mt-4">কোড স্পেশালিস্ট</h3>
            <p className="font-bn text-[13px] text-zinc-600 mt-1 leading-6">CodeLlama + DeepSeek দিয়ে বাংলায় বুঝিয়ে কোড লেখে, বাগ ফিক্স করে।</p>
          </div>

          <div className="md:col-span-4 rounded-[24px] bg-white border border-zinc-200 p-6 shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-zinc-100 grid place-items-center">✉️</div>
            <h3 className="font-bn font-bold text-[17px] mt-4">ইমেইল ড্রাফট বাংলায়</h3>
            <p className="font-bn text-[13px] text-zinc-600 mt-1 leading-6">ক্লায়েন্টকে ইংরেজিতে প্রফেশনাল মেইল, ভেতরে বাংলায় আইডিয়া দিন।</p>
          </div>

          <div className="md:col-span-4 rounded-[24px] bg-[#FCFCF9] border border-dashed border-zinc-300 p-6">
            <div className="h-10 w-10 rounded-xl bg-white border border-zinc-200 grid place-items-center">🔒</div>
            <h3 className="font-bn font-bold text-[17px] mt-4">১০০% প্রাইভেট অপশন</h3>
            <p className="font-bn text-[13px] text-zinc-600 mt-1 leading-6">Local Ollama সাপোর্ট — আপনার ডাটা আপনার সার্ভারেই থাকবে।</p>
            <div className="mt-3 inline-flex px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bn font-medium">GDPR Ready</div>
          </div>

          <div className="md:col-span-12 rounded-[24px] bg-[#0E7C3A] text-white p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
            <div className="absolute right-0 top-0 h-full w-[42%] bg-gradient-to-l from-white/10 to-transparent pointer-events-none" />
            <div className="flex gap-4 items-start relative">
              <div className="h-11 w-11 rounded-xl bg-white text-[#0E7C3A] grid place-items-center text-[20px]">📣</div>
              <div>
                <h3 className="font-bn font-bold text-[19px]">Facebook Post Generator</h3>
                <p className="font-bn text-[14px] text-white/80 mt-1 max-w-[520px]">প্রতিদিনের অফার পোস্ট, হ্যাশট্যাগ, CTA সহ — ১০ সেকেন্ডে। SME দের জন্য বেস্ট।</p>
              </div>
            </div>
            <a href="https://hostamar.com/generate" className="font-bn h-10 px-5 rounded-full bg-white text-zinc-900 font-semibold text-[14px] inline-flex items-center justify-center shrink-0">এখনই ট্রাই করুন</a>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="mx-auto max-w-[1180px] px-4 sm:px-6 py-6 sm:py-8">
        <h2 className="font-bn text-[28px] sm:text-[32px] font-bold tracking-tight">কে কীভাবে ব্যবহার করছে</h2>
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          {[
            {
              k:"ছাত্র",
              title:"হোমওয়ার্ক সলভার",
              desc:"গণিত, ফিজিক্স, ইংরেজি গ্রামার — বাংলায় বুঝিয়ে সমাধান। PDF থেকে প্রশ্ন তুলে উত্তর।",
              points:["ছবি তুলে প্রশ্ন করুন","স্টেপ বাই স্টেপ সমাধান","পরীক্ষার নোট বানায়"],
              accent:"bg-[#0E7C3A]"
            },
            {
              k:"ফ্রিল্যান্সার",
              title:"ক্লায়েন্ট ইমেইল",
              desc:"বাংলায় আইডিয়া লিখুন, AI প্রফেশনাল ইংরেজিতে মেইল বানিয়ে দেবে।",
              points:["English → Bangla ট্রান্সলেট","Upwork প্রপোজাল","রিভিশন রিকোয়েস্ট হ্যান্ডেল"],
              accent:"bg-zinc-900"
            },
            {
              k:"SME ওনার",
              title:"ডেইলি ফেসবুক পোস্ট",
              desc:"দোকানের অফার লিখে দিলেই ৩টি ক্যাপশন, হ্যাশট্যাগ, কল টু অ্যাকশন সহ রেডি।",
              points:["বিরিয়ানি, কাপড়, গ্যাজেট টেমপ্লেট","অফার ক্যালেন্ডার","কমেন্ট রিপ্লাই"],
              accent:"bg-[#E4312B]"
            }
          ].map((c)=>(
            <div key={c.k} className="rounded-[24px] bg-white border border-zinc-200 p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <span className={`h-7 px-2.5 rounded-full text-white text-[11px] font-bn font-bold grid place-items-center ${c.accent}`}>{c.k}</span>
                <span className="h-px flex-1 bg-zinc-100" />
              </div>
              <h3 className="font-bn font-bold text-[18px] mt-4">{c.title}</h3>
              <p className="font-bn text-[13.5px] leading-6 text-zinc-600 mt-1.5">{c.desc}</p>
              <ul className="mt-4 space-y-2">
                {c.points.map(p=>(
                  <li key={p} className="flex gap-2 text-[13px] font-bn text-zinc-700"><span className="text-[#0E7C3A] mt-[1px]">✓</span>{p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-[1180px] px-4 sm:px-6 py-12 sm:py-16">
        <div className="text-center max-w-[560px] mx-auto">
          <h2 className="font-bn text-[30px] sm:text-[40px] font-bold tracking-tight leading-[1.05]">সহজ প্রাইসিং, bKash এ পেমেন্ট</h2>
          <p className="font-bn text-[14px] text-zinc-600 mt-3">কোনো হিডেন ফি নেই। যেকোনো সময় ক্যানসেল করুন।</p>
          <div className="mt-6 inline-flex p-1 rounded-full bg-zinc-100 border border-zinc-200">
            <button onClick={()=>setYearly(false)} className={`h-8 px-4 rounded-full text-[13px] font-bn font-medium transition ${!yearly ? "bg-white shadow-sm border border-zinc-200 text-zinc-900" : "text-zinc-500"}`}>মাসিক</button>
            <button onClick={()=>setYearly(true)} className={`h-8 px-4 rounded-full text-[13px] font-bn font-medium transition flex items-center gap-1.5 ${yearly ? "bg-white shadow-sm border border-zinc-200 text-zinc-900" : "text-zinc-500"}`}>বার্ষিক <span className="px-1.5 py-0.5 rounded-full bg-[#E4312B] text-white text-[10px]">২০% ছাড়</span></button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mt-8 items-start">
          {/* Free */}
          <div className="rounded-[24px] bg-white border border-zinc-200 p-6">
            <div className="font-bn font-bold text-[18px]">ফ্রি</div>
            <div className="mt-3 flex items-baseline gap-1"><span className="font-en font-bold text-[34px]">০</span><span className="font-bn text-zinc-500">টাকা / দিন</span></div>
            <p className="font-bn text-[13px] text-zinc-600 mt-1">৫০ মেসেজ প্রতিদিন, সব বেসিক ফিচার</p>
            <ul className="mt-5 space-y-2.5 text-[13px] font-bn">
              {["৫০ মেসেজ / দিন","বাংলা ভয়েস ইনপুট","PDF আপলোড ৩টি/দিন"].map(f=>(
                <li key={f} className="flex gap-2"><span className="text-zinc-400">—</span>{f}</li>
              ))}
            </ul>
            <a href="https://hostamar.com/generate" className="mt-6 h-11 w-full rounded-full border border-zinc-200 bg-zinc-50 font-bn font-semibold grid place-items-center">ফ্রি শুরু করুন</a>
          </div>

          {/* Starter */}
          <div className="rounded-[24px] bg-zinc-900 text-white p-6 relative shadow-[0_20px_50px_-20px_rgba(0,0,0,0.5)] border border-zinc-800 scale-[1.02]">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#0E7C3A] text-white text-[11px] font-bn font-bold tracking-wide shadow">Most Popular</div>
            <div className="font-bn font-bold text-[18px] flex items-center gap-2">স্টার্টার <span className="h-5 w-5 rounded-full bg-white/10 grid place-items-center text-[10px]">★</span></div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-en font-bold text-[34px]">{yearly ? "১৬০০" : "২০০০"}</span><span className="font-bn text-white/60">টাকা / মাস</span>
              {yearly && <span className="text-[12px] line-through text-white/40">২০০০</span>}
            </div>
            <p className="font-bn text-[13px] text-white/60 mt-1">আনলিমিটেড চ্যাট + ১০ ভিডিও + ৫GB হোস্টিং</p>
            <ul className="mt-5 space-y-2.5 text-[13px] font-bn">
              {["আনলিমিটেড চ্যাট","১০টি ভিডিও / মাস","৫GB হোস্টিং","প্রায়োরিটি সাপোর্ট","bKash / Nagad / Rocket"].map(f=>(
                <li key={f} className="flex gap-2"><span className="text-[#0E7C3A]">✓</span>{f}</li>
              ))}
            </ul>
            <a href="https://hostamar.com/generate" className="mt-6 h-11 w-full rounded-full bg-[#0E7C3A] font-bn font-semibold grid place-items-center text-white hover:bg-[#0d7235] transition">স্টার্টার নিন</a>
            <div className="mt-3 flex gap-1.5 justify-center">
              {["bKash","Nagad","Rocket","Upay"].map(b=>(
                <span key={b} className="px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-[10px] font-en">{b}</span>
              ))}
            </div>
          </div>

          {/* Business */}
          <div className="rounded-[24px] bg-white border border-zinc-200 p-6">
            <div className="font-bn font-bold text-[18px]">বিজনেস</div>
            <div className="mt-3 flex items-baseline gap-2"><span className="font-en font-bold text-[34px]">{yearly ? "২৮০০" : "৩৫০০"}</span><span className="font-bn text-zinc-500">টাকা / মাস</span></div>
            <p className="font-bn text-[13px] text-zinc-600 mt-1">আনলিমিটেড + API + ৩০ ভিডিও + ২০GB হোস্টিং</p>
            <ul className="mt-5 space-y-2.5 text-[13px] font-bn">
              {["সবকিছু আনলিমিটেড","API এক্সেস","৩০টি ভিডিও / মাস","২০GB হোস্টিং","টিম মেম্বার ৫ জন"].map(f=>(
                <li key={f} className="flex gap-2"><span className="text-[#0E7C3A]">✓</span>{f}</li>
              ))}
            </ul>
            <a href="https://hostamar.com/generate" className="mt-6 h-11 w-full rounded-full bg-zinc-900 text-white font-bn font-semibold grid place-items-center">বিজনেস নিন</a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-[760px] px-4 sm:px-6 pb-12">
        <h2 className="font-bn text-[24px] sm:text-[28px] font-bold text-center">প্রশ্নোত্তর</h2>
        <div className="mt-6 rounded-[20px] bg-white border border-zinc-200 divide-y divide-zinc-100 overflow-hidden">
          {[
            { q:"আমার ডাটা কোথায় থাকে? প্রাইভেসি কেমন?", a:"আপনার সব চ্যাট এনক্রিপ্টেড থাকে। বাংলাদেশ রিজিয়নে স্টোর হয়। চাইলে ১০০% লোকাল Ollama মোড অন করতে পারেন — তখন কোনো ডাটাই বাইরে যাবে না। আমরা আপনার ডাটা বিক্রি করি না।" },
            { q:"বাংলা ভয়েস কি মোবাইলে কাজ করে?", a:"হ্যাঁ, ১০০% কাজ করে। Android, iPhone দুটোতেই। বাংলায় কথা বলুন, উত্তর শুনুন। রিকশা বা দোকানে বসেও ব্যবহার করতে পারবেন। ৯৮% একুরেসি বাংলা ভয়েস রিকগনিশনে।" },
            { q:"bKash পেমেন্টে রিফান্ড পলিসি কী?", a:"৭ দিনের মধ্যে ফুল রিফান্ড। কোনো প্রশ্ন ছাড়াই bKash / Nagad / Rocket / Upay তে টাকা ফেরত পাবেন। সাপোর্টে মেসেজ দিলেই ২৪ ঘণ্টার মধ্যে প্রসেস।" },
          ].map((item, i)=>(
            <div key={i} className="">
              <button onClick={()=>setOpenFaq(openFaq===i ? null : i)} className="w-full text-left px-5 sm:px-6 py-5 flex items-start justify-between gap-4">
                <span className="font-bn font-semibold text-[15px] leading-6">{item.q}</span>
                <span className={`h-7 w-7 rounded-full border grid place-items-center shrink-0 transition ${openFaq===i ? "bg-zinc-900 text-white border-zinc-900" : "bg-white border-zinc-200 text-zinc-500"}`}>{openFaq===i ? "−" : "+"}</span>
              </button>
              {openFaq===i && (
                <div className="px-5 sm:px-6 pb-5 -mt-1">
                  <p className="font-bn text-[13.5px] leading-7 text-zinc-600">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-[1180px] px-4 sm:px-6 pb-10">
        <div className="rounded-[28px] bg-zinc-950 text-white p-6 sm:p-10 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 h-[420px] w-[420px] bg-[#0E7C3A]/30 blur-[80px] rounded-full pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 h-[360px] w-[360px] bg-[#E4312B]/20 blur-[80px] rounded-full pointer-events-none" />
          <div className="relative grid lg:grid-cols-[1.2fr_0.8fr] gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[12px] font-bn"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/> Hostamar Studio সাথে কানেক্টেড</div>
              <h2 className="font-bn font-bold text-[28px] sm:text-[36px] leading-[1.1] mt-4">ভিডিও স্ক্রিপ্ট লিখতে Chat ব্যবহার করুন,<br/>তারপর এক ক্লিকে ভিডিও বানান</h2>
              <p className="font-bn text-[14px] text-white/60 mt-3 max-w-[520px] leading-6">Chat এ স্ক্রিপ্ট রেডি করুন, Studio তে পাঠান, AI ভয়েস ওভার সহ ভিডিও তৈরি হয়ে যাবে। ফেসবুক পেজের জন্য প্রতিদিনের কন্টেন্ট ২ মিনিটে।</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="https://hostamar.com/generate" className="font-bn h-11 px-6 rounded-full bg-white text-zinc-900 font-semibold inline-flex items-center gap-2">Studio তে যান <span>→</span></a>
                <span className="font-bn text-[12px] text-white/50 inline-flex items-center">Hostamar Video কিনলে Chat ফ্রি</span>
              </div>
            </div>
            <div className="rounded-[20px] bg-white/5 border border-white/10 p-4 backdrop-blur">
              <div className="rounded-xl bg-white text-zinc-900 p-4">
                <div className="font-bn text-[12px] font-semibold text-zinc-500">CHAT → VIDEO WORKFLOW</div>
                <div className="mt-3 space-y-2.5 font-bn text-[13px]">
                  <div className="flex gap-2"><span className="h-6 w-6 rounded-full bg-zinc-900 text-white grid place-items-center text-[11px]">1</span> Chat এ লিখুন: “বিরিয়ানি অফারের ৩০ সেকেন্ড স্ক্রিপ্ট”</div>
                  <div className="flex gap-2"><span className="h-6 w-6 rounded-full bg-zinc-900 text-white grid place-items-center text-[11px]">2</span> “Studio তে পাঠান” ক্লিক করুন</div>
                  <div className="flex gap-2"><span className="h-6 w-6 rounded-full bg-[#0E7C3A] text-white grid place-items-center text-[11px]">3</span> ভিডিও রেডি — ডাউনলোড বা সরাসরি পোস্ট</div>
                </div>
                <div className="mt-4 h-9 rounded-full bg-zinc-900 text-white grid place-items-center font-bn text-[13px] font-medium">এক ক্লিকে ভিডিও বানান</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row justify-between gap-8">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-[#0E7C3A] text-white grid place-items-center font-bold">হ</div>
                <span className="font-bn font-bold">Hostamar Chat</span>
              </div>
              <p className="font-bn text-[13px] text-zinc-500 mt-3 max-w-[300px] leading-6">বাংলাদেশের SME, স্টুডেন্ট ও ফ্রিল্যান্সারদের জন্য তৈরি AI চ্যাট। বাংলা বোঝে, বাংলায় কাজ করে।</p>
              <div className="mt-4 inline-flex px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[12px] font-bn font-medium">🎁 Hostamar Video কিনলে Chat ফ্রি — অফার চলছে</div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-[13px] font-bn">
              <div>
                <div className="font-semibold mb-3">প্রোডাক্ট</div>
                <div className="space-y-2 text-zinc-600"><div>টেমপ্লেট</div><div>প্রাইসিং</div><div>API ডকস</div></div>
              </div>
              <div>
                <div className="font-semibold mb-3">সাপোর্ট</div>
                <div className="space-y-2 text-zinc-600"><div>হেল্প সেন্টার</div><div>bKash রিফান্ড</div><div>প্রাইভেসি</div></div>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <div className="font-semibold mb-3">পেমেন্ট</div>
                <div className="flex flex-wrap gap-1.5">
                  {["bKash","Nagad","Rocket","Upay"].map(b=>(
                    <span key={b} className="px-2.5 py-1 rounded-full bg-zinc-100 border border-zinc-200 font-en text-[11px] font-semibold">{b}</span>
                  ))}
                </div>
                <div className="mt-3 text-[11px] text-zinc-400 font-en">SSL Secured • 500+ users</div>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-zinc-100 flex flex-col sm:flex-row justify-between gap-2 text-[12px] font-en text-zinc-400">
            <span>© {new Date().getFullYear()} Hostamar. Made for Bangladesh.</span>
            <span className="font-bn">বাংলায় কথা বলুন, কাজ করিয়ে নিন</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
