'use client'
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
const SupportWidget = dynamic(() => import("@/components/SupportWidget"), { ssr: false });
const VoiceAgentClient = dynamic(() => import("@/components/voice/VoiceAgentClient"), { ssr: false });

const DAILY_LIMIT = 100;
function dayKey(){ return new Date().toISOString().slice(0,10) }
function getUsed():number{
  if(typeof window==='undefined') return 0
  try{ return parseInt(localStorage.getItem('hostamar_chat_used_'+dayKey())||'0',10)||0 }catch{ return 0 }
}
function incUsed(){ try{ const k='hostamar_chat_used_'+dayKey(); localStorage.setItem(k, String(getUsed()+1)) }catch{} }

export default function ChatPage(){
  const [yearly,setYearly]=useState(false)
  const [openFaq,setOpenFaq]=useState<number|null>(0)
  const [copiedIdx,setCopiedIdx]=useState<number|null>(null)
  const [voiceOpen,setVoiceOpen]=useState(false)
  const [mounted,setMounted]=useState(false)
  const [msgUsed,setMsgUsed]=useState(0)
  const [tawkLoaded,setTawkLoaded]=useState(false)
  const [typingDemo,setTypingDemo]=useState(true)

  useEffect(()=>{
    setMounted(true)
    setMsgUsed(getUsed())
    const iv=setInterval(()=>setMsgUsed(getUsed()),2000)
    // Tawk.to fallback: if env set, inject script; otherwise SupportWidget is primary
    const propId = process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID
    if(propId && !document.getElementById('tawk-script')){
      const s=document.createElement('script')
      s.id='tawk-script'
      s.async=true
      s.src=`https://embed.tawk.to/${propId}/default`
      s.charset='UTF-8'
      s.setAttribute('crossorigin','*')
      document.body.appendChild(s)
      setTawkLoaded(true)
    }
    // typing demo loop
    const t=setInterval(()=>setTypingDemo(v=>!v), 3200)
    return ()=>{ clearInterval(iv); clearInterval(t) }
  },[])

  const captions=[
    "🔥 শুক্রবার স্পেশাল! ঢাকার সেরা কাচ্চি বিরিয়ানি মাত্র ২৯৯ টাকায়! পরিবার নিয়ে চলে আসুন আজই। #বিরিয়ানিলাভার #ঢাকাফুড",
    "😋 ঘ্রাণেই অর্ধেক খাওয়া শেষ! আমাদের স্পেশাল দম বিরিয়ানি - একবার খেলে বারবার আসবেন। হোম ডেলিভারি চলছে। #ফুডডেলিভারি",
    "✨ আজকের অফার মিস করবেন না! ২টি বিরিয়ানি অর্ডারে ১টি বোরহানি ফ্রি! অর্ডার করতে ইনবক্স করুন। #অফার #বিরিয়ানি",
  ]
  const handleCopy=(text:string, idx:number)=>{
    navigator.clipboard?.writeText(text)
    setCopiedIdx(idx)
    incUsed(); setMsgUsed(getUsed())
    setTimeout(()=>setCopiedIdx(null),1600)
  }

  const remaining = Math.max(0, DAILY_LIMIT - msgUsed)
  const pct = Math.round((msgUsed/DAILY_LIMIT)*100)

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-zinc-900 antialiased selection:bg-[#2563EB]/20 overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        h1,h2,h3,.font-bn { font-family: "Hind Siliguri", system-ui, sans-serif; }
        body, .font-en { font-family: "Inter", system-ui, sans-serif; }
      `}</style>

      {/* Trust Bar */}
      <div className="w-full bg-zinc-900 text-zinc-100 text-[13px] font-en overflow-x-hidden">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6 h-9 flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-3 min-w-0 overflow-hidden">
            <span className="inline-flex items-center gap-1.5 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB] animate-pulse" />
              <span className="font-bn font-medium truncate">৫০০+ ক্রিয়েটর Hostamar Chat ব্যবহার করছেন</span>
            </span>
            <span className="hidden sm:inline h-3 w-px bg-white/20 shrink-0" />
            <span className="hidden sm:inline-flex items-center gap-1 shrink-0">
              <span className="text-amber-300">★</span> ৪.৮ রেটিং (১২৪ রিভিউ)
            </span>
          </div>
          <span className="font-bn text-zinc-400 hidden lg:block shrink-0">বাংলাদেশের জন্য তৈরি • bKash এ পেমেন্ট</span>
          <span className="lg:hidden text-amber-300 shrink-0 text-[11px]">★ ৪.৮</span>
        </div>
      </div>

      {/* SLA + Limit bar — spec: Messenger till 11pm + 100msg/day */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-zinc-200 overflow-x-hidden">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6 h-[44px] flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#2563EB]/10 border border-[#2563EB]/20 text-[#2563EB] text-[11px] font-bold shrink-0">Messenger till 11pm</span>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-medium shrink-0">SLA 2s reply</span>
            <span className="hidden md:inline text-[11px] text-zinc-500 truncate">SupportWidget live • {tawkLoaded ? 'Tawk.to linked' : 'Hostamar AI primary'}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-[84px] h-1.5 rounded-full bg-zinc-100 overflow-hidden"><div className="h-full bg-[#2563EB] transition-all" style={{width:`${pct}%`}}/></div>
              <span className="text-[11px] font-mono text-zinc-600">{msgUsed}/{DAILY_LIMIT}</span>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${remaining>20 ? 'bg-white border-zinc-200 text-zinc-700' : remaining>0 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-red-50 border-red-200 text-red-700'}`}>{remaining>0 ? `${remaining} msgs left` : 'Daily limit reached'}</span>
            <a href="#live-chat" className="hidden sm:inline-flex h-7 px-3 rounded-full bg-[#2563EB] text-white text-[12px] font-semibold items-center hover:bg-[#1D4ED8]">Try Live Chat</a>
          </div>
        </div>
        <div className="sm:hidden px-4 pb-2 flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-zinc-100 overflow-hidden"><div className="h-full bg-[#2563EB]" style={{width:`${pct}%`}}/></div>
          <span className="text-[11px] font-mono text-zinc-500">{msgUsed}/{DAILY_LIMIT}</span>
        </div>
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-[1180px] px-4 sm:px-6 pt-8 sm:pt-12 pb-8 overflow-x-hidden">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-12 items-start">
          <div className="pt-2 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-zinc-200 shadow-sm text-[12px] font-bn max-w-full">
              <span className="px-2 py-0.5 rounded-full bg-[#E4312B] text-white font-semibold text-[11px] shrink-0">নতুন</span>
              <span className="truncate">GPT-4 ক্লাস মডেল এখন বাংলায়, ভয়েস সহ — SupportWidget live</span>
            </div>
            <h1 className="font-bn font-bold leading-[0.98] tracking-[-0.03em] text-[34px] sm:text-[56px] lg:text-[64px] mt-6 break-words">
              বাংলায় কথা<br/>বলুন, <span className="relative inline-block"><span className="relative z-10 text-[#2563EB]">কাজ করিয়ে</span><span className="absolute bottom-1 left-0 right-0 h-3 bg-[#2563EB]/15 rounded-full -z-0" /></span> নিন
            </h1>
            <p className="font-bn text-[16px] sm:text-[18px] leading-7 text-zinc-600 mt-5 max-w-[520px]">GPT-4 ক্লাস মডেল, বাংলা ভয়েস ইনপুট আউটপুট, PDF পড়ে উত্তর দেয়, কোড লেখে। বাংলাদেশি বিজনেসের জন্য বানানো।</p>
            <div className="flex flex-wrap gap-3 mt-7">
              <a href="#live-chat" className="font-bn inline-flex items-center gap-2 h-[46px] px-6 rounded-full bg-[#2563EB] text-white font-semibold shadow-[0_12px_24px_-14px_#2563EB] hover:bg-[#1D4ED8] transition">ফ্রি চ্যাট শুরু করুন <span className="h-6 w-6 rounded-full bg-white/15 grid place-items-center">→</span></a>
              <a href="#demo" className="font-bn inline-flex h-[46px] px-6 rounded-full bg-white border border-zinc-200 font-medium items-center gap-2 hover:bg-zinc-50 transition"><span className="h-5 w-5 rounded-full bg-zinc-900 text-white grid place-items-center text-[10px]">▶</span> ডেমো দেখুন</a>
              <button onClick={()=>setVoiceOpen(v=>!v)} className="font-bn inline-flex h-[46px] px-6 rounded-full bg-[#E4312B] text-white font-semibold items-center gap-2 hover:bg-[#c92a25] transition"><span className="h-5 w-5 rounded-full bg-white/15 grid place-items-center text-[10px]">🎙️</span> ভয়েস মোড</button>
            </div>
            <p className="font-bn text-[12px] text-zinc-500 mt-3">Daily limit: <b>{DAILY_LIMIT} msgs/day</b> on free • Messenger support till 11pm • Tawk.to: {process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID ? 'connected' : 'fallback to Hostamar AI'}</p>
          </div>

          {/* Right Chat Mock with typing indicator + limit */}
          <div id="demo" className="relative min-w-0 w-full max-w-full overflow-hidden">
            <div className="absolute -top-10 -right-10 h-64 w-64 bg-[#2563EB]/10 blur-[60px] rounded-full pointer-events-none" />
            <div className="rounded-[28px] bg-white border border-zinc-200 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.18),0_8px_20px_-12px_rgba(0,0,0,0.08)] overflow-hidden w-full max-w-full">
              <div className="h-[56px] px-5 flex items-center justify-between border-b border-zinc-100 gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-zinc-900 text-white grid place-items-center text-[12px] font-bold shrink-0">AI</div>
                  <div className="min-w-0"><div className="font-bn text-[14px] font-semibold leading-none truncate">Hostamar Chat</div><div className="font-en text-[11px] text-emerald-600 flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/> অনলাইন • Messenger till 11pm</div></div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="hidden sm:inline text-[11px] px-2 py-1 rounded-full bg-zinc-50 border text-zinc-600">{remaining} left</span>
                  <span className="h-7 px-2.5 rounded-full bg-zinc-50 border border-zinc-200 text-[11px] font-medium grid place-items-center">GPT-4 Class</span>
                </div>
              </div>
              <div className="p-4 sm:p-5 space-y-4 bg-[#FFFFFF]">
                <div className="flex justify-end"><div className="max-w-[82%] rounded-[18px] rounded-br-[6px] bg-[#2563EB] text-white px-4 py-3 font-bn text-[14px] leading-6 shadow-sm break-words">আমার দোকানের জন্য ফেসবুক ক্যাপশন লিখে দাও - বিরিয়ানি অফার<div className="text-[11px] opacity-70 mt-1 font-en text-right">১২:৪২ PM ✓✓</div></div></div>
                <div className="flex gap-2.5 items-start">
                  <div className="h-7 w-7 rounded-full bg-zinc-900 text-white grid place-items-center text-[10px] font-bold shrink-0 mt-1">AI</div>
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="rounded-[18px] rounded-tl-[6px] bg-white border border-zinc-200 px-4 py-3 shadow-sm">
                      <p className="font-bn text-[13px] font-semibold text-zinc-800">আপনার বিরিয়ানি অফারের জন্য ৩টি ক্যাপশন রেডি:</p>
                      <div className="mt-3 space-y-3">
                        {captions.map((c, idx)=>(
                          <div key={idx} className="group rounded-2xl bg-[#FFFFFF] border border-zinc-200 p-3 flex gap-3 min-w-0">
                            <span className="h-6 w-6 rounded-full bg-[#2563EB]/10 text-[#2563EB] grid place-items-center text-[12px] font-bold shrink-0">{idx+1}</span>
                            <div className="flex-1 min-w-0"><p className="font-bn text-[13.5px] leading-[1.6] text-zinc-700 break-words">{c}</p><div className="mt-2 flex items-center gap-2 flex-wrap"><button disabled={remaining===0} onClick={()=>handleCopy(c, idx)} className="h-7 px-2.5 rounded-full bg-white border border-zinc-200 text-[11px] font-bn font-medium hover:bg-zinc-50 flex items-center gap-1 disabled:opacity-50">{copiedIdx===idx ? "✓ কপি হয়েছে" : "⎙ কপি করুন"}</button><span className="text-[11px] text-zinc-400 font-en">{c.length} chars</span></div></div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* typing indicator — spec required */}
                    <div className={`inline-flex items-center gap-2 rounded-full bg-white border border-zinc-200 px-3 py-2 shadow-sm transition ${typingDemo?'opacity-100':'opacity-60'}`}>
                      <div className="flex gap-1"><span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.2s]" /><span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.1s]" /><span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce" /></div>
                      <span className="font-bn text-[12px] text-zinc-500">টাইপ করছে…</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse ml-1"/>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-3 border-t border-zinc-100 bg-white">
                <div className={`h-11 rounded-full border flex items-center px-3 gap-2 ${remaining===0?'bg-red-50 border-red-200':'bg-zinc-50 border-zinc-200'}`}>
                  <div className="h-8 w-8 rounded-full bg-white border border-zinc-200 grid place-items-center text-zinc-500 shrink-0">🎤</div>
                  <span className="font-bn text-[13px] flex-1 truncate ${remaining===0?'text-red-500':'text-zinc-400'}">{remaining===0 ? 'Daily 100 msg limit reached — try tomorrow' : 'বাংলায় লিখুন বা বলুন...'}</span>
                  <div className={`h-8 w-8 rounded-full grid place-items-center shrink-0 ${remaining===0?'bg-zinc-400':'bg-[#2563EB]'} text-white`}>↑</div>
                </div>
                <div className="flex items-center justify-between mt-2 px-1">
                  <span className="text-[11px] text-zinc-400 font-en">{msgUsed}/{DAILY_LIMIT} today • Messenger till 11pm</span>
                  <span className="text-[11px] text-zinc-400">SupportWidget + {process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID ? 'Tawk.to' : 'AI fallback'}</span>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 -left-2 sm:left-auto sm:-right-3 bg-zinc-900 text-white rounded-2xl px-3.5 py-2.5 shadow-xl flex items-center gap-2.5 max-w-[calc(100%-1rem)]"><div className="h-8 w-8 rounded-xl bg-white/10 grid place-items-center shrink-0">⚡</div><div className="leading-tight min-w-0"><div className="font-bn text-[12px] font-semibold truncate">উত্তর ২ সেকেন্ডে</div><div className="font-en text-[11px] text-white/60">Bengali optimized</div></div></div>
          </div>
        </div>
      </section>

      {/* LIVE CHAT EMBED — spec: inject SupportWidget here */}
      <section id="live-chat" className="mx-auto max-w-[1180px] px-4 sm:px-6 pb-8 overflow-x-hidden">
        <div className="rounded-[24px] border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-0">
            <div className="p-6 sm:p-8 min-w-0">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#2563EB]/10 border border-[#2563EB]/20 text-[#2563EB] text-[11px] font-bold">LIVE WIDGET</div>
              <h2 className="font-bn font-bold text-[22px] sm:text-[26px] mt-3">Live Chat — SupportWidget + Tawk.to fallback</h2>
              <p className="font-bn text-[13px] text-zinc-600 mt-2 leading-6">Floating bubble bottom-right is live on every page via <code className="px-1.5 py-0.5 rounded bg-zinc-100 border text-[11px]">SupportWidget</code>. If <code className="px-1 py-0.5 rounded bg-zinc-100 border text-[11px]">NEXT_PUBLIC_TAWK_PROPERTY_ID</code> is set, Tawk.to loads as fallback; otherwise Hostamar AI handles 100% locally (Ollama/Qdrant). Free tier: <b>100 msgs/day</b>.</p>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                <span className="px-2.5 py-1 rounded-full bg-zinc-900 text-white font-medium">SupportWidget primary</span>
                <span className={`px-2.5 py-1 rounded-full border font-medium ${tawkLoaded?'bg-emerald-50 border-emerald-200 text-emerald-700':'bg-zinc-50 border-zinc-200 text-zinc-500'}`}>{tawkLoaded?'Tawk.to active':'Tawk.to fallback (set env to enable)'}</span>
                <span className="px-2.5 py-1 rounded-full bg-white border text-zinc-600">Messenger till 11pm</span>
              </div>
              <div className="mt-6 rounded-2xl bg-[#FFFFFF] border border-zinc-200 p-4">
                <div className="text-[12px] font-semibold text-zinc-700">How it works</div>
                <ol className="mt-2 space-y-1.5 text-[13px] font-bn text-zinc-600 list-decimal list-inside"><li>Click 💬 bubble → SupportWidget panel opens</li><li>Ask in Bangla/English — RAG via /api/support-chat</li><li>100 msgs/day free — counter above, resets midnight Asia/Dhaka</li><li>After 11pm → async reply next morning, Tawk.to email fallback if configured</li></ol>
              </div>
              <div className="mt-4 flex gap-3 flex-wrap">
                <button onClick={()=>{document.querySelector<HTMLButtonElement>('button[aria-label="AI সাপোর্ট খুলুন"]')?.click()}} className="h-10 px-5 rounded-full bg-[#2563EB] text-white font-bn font-semibold text-[14px] hover:bg-[#1D4ED8]">Open SupportWidget →</button>
                <a href="https://m.me/hostamar" target="_blank" rel="noopener" className="h-10 px-5 rounded-full bg-white border border-zinc-200 font-bn font-medium grid place-items-center text-[13px] hover:bg-zinc-50">Messenger till 11pm</a>
              </div>
            </div>
            <div className="bg-zinc-50 border-t lg:border-t-0 lg:border-l border-zinc-200 p-6 sm:p-8 min-w-0">
              <div className="rounded-2xl bg-white border border-zinc-200 p-4 shadow-sm">
                <div className="text-[12px] font-semibold text-zinc-500">WIDGET STATUS</div>
                <div className="mt-3 space-y-2 text-[13px] font-mono">
                  <div className="flex justify-between"><span className="text-zinc-500">SupportWidget</span><span className="text-emerald-600">● live</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Tawk.to env</span><span className={process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID?'text-emerald-600':'text-zinc-400'}>{process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID?'● set':'○ not set (fallback)'}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Daily limit</span><span className="text-zinc-800">{DAILY_LIMIT}/day ({remaining} left)</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">SLA</span><span className="text-zinc-800">Messenger till 11pm</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Typing</span><span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce"/><span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.1s]"/><span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.2s]"/></span></div>
                </div>
                <div className="mt-4 h-px bg-zinc-100"/>
                <p className="mt-3 text-[11px] text-zinc-500 font-bn leading-5">Env: set <code>NEXT_PUBLIC_TAWK_PROPERTY_ID=xxxxx</code> in Vercel to enable Tawk.to alongside SupportWidget. No env = zero-cost Hostamar AI only.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing (kept) */}
      <section id="pricing" className="mx-auto max-w-[1180px] px-4 sm:px-6 py-8 sm:py-12 overflow-x-hidden">
        <div className="text-center max-w-[560px] mx-auto">
          <h2 className="font-bn text-[28px] sm:text-[40px] font-bold tracking-tight leading-[1.05]">সহজ প্রাইসিং, bKash এ পেমেন্ট</h2>
          <p className="font-bn text-[14px] text-zinc-600 mt-3">কোনো হিডেন ফি নেই। যেকোনো সময় ক্যানসেল করুন।</p>
          <div className="mt-6 inline-flex p-1 rounded-full bg-zinc-100 border border-zinc-200">
            <button onClick={()=>setYearly(false)} className={`h-8 px-4 rounded-full text-[13px] font-bn font-medium transition ${!yearly ? "bg-white shadow-sm border border-zinc-200 text-zinc-900" : "text-zinc-500"}`}>মাসিক</button>
            <button onClick={()=>setYearly(true)} className={`h-8 px-4 rounded-full text-[13px] font-bn font-medium transition flex items-center gap-1.5 ${yearly ? "bg-white shadow-sm border border-zinc-200 text-zinc-900" : "text-zinc-500"}`}>বার্ষিক <span className="px-1.5 py-0.5 rounded-full bg-[#E4312B] text-white text-[10px]">২০% ছাড়</span></button>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4 mt-8 items-start">
          <div className="rounded-[24px] bg-white border border-zinc-200 p-6 min-w-0"><div className="font-bn font-bold text-[18px]">ফ্রি</div><div className="mt-3 flex items-baseline gap-1"><span className="font-en font-bold text-[34px]">০</span><span className="font-bn text-zinc-500">টাকা / দিন</span></div><p className="font-bn text-[13px] text-zinc-600 mt-1">100 মেসেজ প্রতিদিন, সব বেসিক ফিচার</p><ul className="mt-5 space-y-2.5 text-[13px] font-bn">{["100 মেসেজ / দিন (free)","বাংলা ভয়েস ইনপুট","PDF আপলোড ৩টি/দিন"].map(f=>(<li key={f} className="flex gap-2"><span className="text-zinc-400">—</span>{f}</li>))}</ul><a href="#live-chat" className="mt-6 h-11 w-full rounded-full border border-zinc-200 bg-zinc-50 font-bn font-semibold grid place-items-center">ফ্রি শুরু করুন</a></div>
          <div className="rounded-[24px] bg-zinc-900 text-white p-6 relative shadow-[0_20px_50px_-20px_rgba(0,0,0,0.5)] border border-zinc-800 scale-[1.02] min-w-0"><div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#2563EB] text-white text-[11px] font-bn font-bold tracking-wide shadow">Most Popular</div><div className="font-bn font-bold text-[18px] flex items-center gap-2">স্টার্টার <span className="h-5 w-5 rounded-full bg-white/10 grid place-items-center text-[10px]">★</span></div><div className="mt-3 flex items-baseline gap-2"><span className="font-en font-bold text-[34px]">{yearly ? "১৬০০" : "২০০০"}</span><span className="font-bn text-white/60">টাকা / মাস</span>{yearly && <span className="text-[12px] line-through text-white/40">২০০০</span>}</div><p className="font-bn text-[13px] text-white/60 mt-1">আনলিমিটেড চ্যাট + ১০ ভিডিও + ৫GB হোস্টিং</p><ul className="mt-5 space-y-2.5 text-[13px] font-bn">{["আনলিমিটেড চ্যাট (100+/day)","১০টি ভিডিও / মাস","৫GB হোস্টিং","Messenger till 11pm","bKash / Nagad / Rocket"].map(f=>(<li key={f} className="flex gap-2"><span className="text-[#2563EB]">✓</span>{f}</li>))}</ul><a href="https://hostamar.com/generate" className="mt-6 h-11 w-full rounded-full bg-[#2563EB] font-bn font-semibold grid place-items-center text-white hover:bg-[#1D4ED8] transition">স্টার্টার নিন</a></div>
          <div className="rounded-[24px] bg-white border border-zinc-200 p-6 min-w-0"><div className="font-bn font-bold text-[18px]">বিজনেস</div><div className="mt-3 flex items-baseline gap-2"><span className="font-en font-bold text-[34px]">{yearly ? "২৮০০" : "৩৫০০"}</span><span className="font-bn text-zinc-500">টাকা / মাস</span></div><p className="font-bn text-[13px] text-zinc-600 mt-1">আনলিমিটেড + API + ৩০ ভিডিও + ২০GB হোস্টিং</p><ul className="mt-5 space-y-2.5 text-[13px] font-bn">{["সবকিছু আনলিমিটেড","API এক্সেস","৩০টি ভিডিও / মাস","২০GB হোস্টিং","টিম মেম্বার ৫ জন"].map(f=>(<li key={f} className="flex gap-2"><span className="text-[#2563EB]">✓</span>{f}</li>))}</ul><a href="https://hostamar.com/generate" className="mt-6 h-11 w-full rounded-full bg-zinc-900 text-white font-bn font-semibold grid place-items-center">বিজনেস নিন</a></div>
        </div>
      </section>

      {/* Single sticky CTA */}
      <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur border-t border-zinc-200">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6 h-[64px] flex items-center justify-between gap-3 min-w-0">
          <div className="text-[13px] font-bn min-w-0"><span className="font-semibold">100 msgs/day free</span><span className="hidden sm:inline text-zinc-500"> • Messenger till 11pm • bKash</span></div>
          <a href="#live-chat" className="h-10 px-6 rounded-full bg-[#2563EB] text-white font-bn font-semibold text-[14px] inline-flex items-center justify-center shrink-0 hover:bg-[#1D4ED8]">চ্যাট শুরু করুন →</a>
        </div>
      </div>

      {mounted && <SupportWidget />}
      {mounted && voiceOpen && (<div className="fixed bottom-5 right-[4.5rem] sm:right-20 z-50 w-[340px] max-w-[calc(100vw-2.5rem)]"><VoiceAgentClient mode="chat" /></div>)}
    </div>
  );
}
