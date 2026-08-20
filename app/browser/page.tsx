'use client'
import { useState, useRef, useEffect } from "react";
import { FileText, Youtube, Globe, Zap, ShieldCheck, Sparkles, ArrowUpRight, ExternalLink, MessageCircle, Check, X, Star, ChevronDown, Play } from "lucide-react";

type Tab = "summary"|"chat"|"translate"

export default function BrowserPage(){
  const [openFaq,setOpenFaq]=useState<number|null>(0)
  const [url,setUrl]=useState("https://example.com/article")
  const [activeUrl,setActiveUrl]=useState("https://example.com")
  const [tab,setTab]=useState<Tab>("summary")
  const [frameKey,setFrameKey]=useState(0)
  const [tabs,setTabs]=useState<string[]>(["https://example.com","https://arxiv.org/abs/2408.00001"])
  const [summary,setSummary]=useState<string>("")
  const [summBusy,setSummBusy]=useState(false)
  const [summErr,setSummErr]=useState<string>("")
  const [pageText,setPageText]=useState("Sample page content to summarize. Paste URL and hit Summarize — BrowserFrame will extract context and call /api/browser/summarize.")
  const iframeRef=useRef<HTMLIFrameElement>(null)

  function normalize(u:string){
    try{ if(!/^https?:\/\//i.test(u)) u='https://'+u; new URL(u); return u }catch{ return u }
  }
  function go(){
    const n=normalize(url.trim()); if(!n) return
    setActiveUrl(n); setFrameKey(k=>k+1)
    if(!tabs.includes(n)) setTabs(t=>[...t.slice(-4), n])
    setSummary(""); setSummErr("")
  }
  async function doSummarize(){
    setSummBusy(true); setSummErr(""); setTab("summary")
    try{
      let text=pageText
      // try to extract from iframe if same-origin or accessible
      try{
        const doc=iframeRef.current?.contentDocument
        if(doc){
          const t=(doc.body?.innerText||"").slice(0,14000)
          if(t.trim().length>40) text=t
        }
      }catch{}
      const res=await fetch('/api/browser/summarize',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text, url:activeUrl})})
      const j=await res.json()
      if(!res.ok) throw new Error(j.error||j.message||'Summarize failed')
      setSummary(j.summary||'No summary')
    }catch(e:any){ setSummErr(e.message||'Failed') } finally{ setSummBusy(false) }
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-zinc-900 antialiased selection:bg-[#2563EB]/15 overflow-x-hidden">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap'); h1,h2,h3,.font-bangla{font-family:"Hind Siliguri",sans-serif} .font-inter{font-family:"Inter",system-ui,sans-serif}`}</style>

      {/* Trust Bar */}
      <div className="w-full bg-zinc-900 text-zinc-100 text-[13px] leading-none overflow-x-hidden">
        <div className="mx-auto max-w-[1180px] px-4 md:px-6 h-9 flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-3 md:gap-6 overflow-hidden min-w-0">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"/> <span className="font-medium">৫০০+ ক্রিয়েটর ব্যবহার করছে</span></span>
            <span className="hidden sm:inline-flex items-center gap-1.5 whitespace-nowrap border-l border-white/15 pl-6 shrink-0"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400"/><span className="font-semibold">৪.৮</span><span className="opacity-70">/ ১২৩ রিভিউ</span></span>
          </div>
          <div className="text-[12px] whitespace-nowrap opacity-80 shrink-0 hidden sm:block">bKash • Nagad • Rocket</div>
        </div>
      </div>

      {/* Sticky URL bar — BrowserFrame spec */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-zinc-200 overflow-x-hidden">
        <div className="mx-auto max-w-[1180px] px-4 md:px-6 py-2.5 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center min-w-0">
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <div className="hidden sm:flex gap-1.5 shrink-0"><span className="h-3 w-3 rounded-full bg-[#FF5F57] border border-black/10"/><span className="h-3 w-3 rounded-full bg-[#FFBD2E] border border-black/10"/><span className="h-3 w-3 rounded-full bg-[#28C840] border border-black/10"/></div>
            <div className="flex-1 flex items-center gap-2 rounded-full bg-white border border-zinc-200 h-9 px-3 min-w-0 shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0"/>
              <input value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==='Enter'&&go()} placeholder="https://example.com/article" className="flex-1 bg-transparent outline-none text-[13px] placeholder:opacity-50 min-w-0 truncate"/>
              <button onClick={go} className="shrink-0 h-7 px-3 rounded-full bg-[#2563EB] text-white text-[12px] font-semibold hover:bg-[#1D4ED8]">Go</button>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={doSummarize} disabled={summBusy} className="h-9 px-4 rounded-full bg-[#2563EB] text-white text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-60 hover:bg-[#1D4ED8]"><Sparkles className="h-3.5 w-3.5"/>{summBusy?'Summarizing…':'Summarize'}</button>
            <button onClick={()=>{ try{ const t=iframeRef.current?.contentDocument?.body?.innerText?.slice(0,4000)||""; if(t) setPageText(t); setTab("summary"); setSummary(t? 'Context extracted ✓ — hit Summarize':'Could not read iframe (cross-origin). Paste text below.')}catch{} }} className="h-9 px-3 rounded-full bg-white border border-zinc-200 text-[12px] font-medium hover:bg-zinc-50 whitespace-nowrap">Extract Page Context</button>
          </div>
        </div>
        {/* Tabs */}
        <div className="mx-auto max-w-[1180px] px-4 md:px-6 pb-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none min-w-0">
          {tabs.map(t=>(
            <button key={t} onClick={()=>{ setActiveUrl(t); setUrl(t); setFrameKey(k=>k+1)}} className={`shrink-0 h-7 px-3 rounded-full text-[11px] font-medium border flex items-center gap-1.5 max-w-[180px] ${t===activeUrl?'bg-zinc-900 text-white border-zinc-900':'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>
              <Globe className="h-3 w-3 shrink-0"/><span className="truncate">{t.replace(/^https?:\/\//,'')}</span>
              <span onClick={(e)=>{e.stopPropagation(); setTabs(v=>v.filter(x=>x!==t))}} className="ml-1 opacity-60 hover:opacity-100">×</span>
            </button>
          ))}
          <button onClick={()=>{const u=normalize(url.trim()); if(u&&!tabs.includes(u)) setTabs(v=>[...v,u])}} className="shrink-0 h-7 w-7 rounded-full bg-white border border-zinc-200 grid place-items-center text-zinc-500">+</button>
          <span className="ml-auto hidden sm:inline text-[11px] text-zinc-400 whitespace-nowrap">iframe sandbox="allow-scripts allow-same-origin"</span>
        </div>
      </div>

      {/* Hero + BrowserFrame */}
      <section className="mx-auto max-w-[1180px] px-4 md:px-6 pt-8 md:pt-10 pb-6 overflow-x-hidden">
        <div className="grid md:grid-cols-[1.05fr_0.95fr] gap-6 md:gap-8 items-start">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[12px] shadow-sm max-w-full"><span className="inline-flex h-5 px-2 items-center rounded-full bg-[#E4312B] text-white font-bold text-[10px] tracking-wide shrink-0">NEW</span><span className="font-medium truncate">Arc ও Perplexity এর চেয়ে ৭০% হালকা — #2563EB</span></div>
            <h1 className="font-bangla mt-4 text-[28px] md:text-[44px] leading-[1.1] font-bold tracking-tight break-words">ইংরেজি আর্টিকেল পড়ার সময় নেই? <span className="bg-gradient-to-r from-[#2563EB] to-[#2563EB]/60 bg-clip-text text-transparent">AI পড়ুক, বাংলায় বুঝিয়ে দিক</span></h1>
            <p className="mt-3 text-[15px] md:text-[16px] leading-[1.7] opacity-70 max-w-[520px] font-bangla break-words">যেকোনো ওয়েবপেজ, ইউটিউব ভিডিও, PDF থেকে <span className="font-semibold opacity-100">১০ লাইনে বাংলা সারাংশ</span>, প্রশ্ন করুন, সোর্স সহ উত্তর পান। BrowserFrame এ এক ক্লিকে।</p>
            <div className="mt-5 rounded-2xl bg-white border border-zinc-200 p-3 flex flex-col gap-2 shadow-sm">
              <label className="text-[11px] font-semibold tracking-wide text-zinc-500">PAGE CONTEXT (editable — used for /api/browser/summarize)</label>
              <textarea value={pageText} onChange={e=>setPageText(e.target.value)} rows={4} className="w-full rounded-xl border border-zinc-200 p-3 text-[13px] leading-6 outline-none focus:ring-2 focus:ring-[#2563EB]/20 resize-none"/>
              <div className="flex flex-wrap gap-2"><button onClick={doSummarize} disabled={summBusy} className="h-8 px-4 rounded-full bg-[#2563EB] text-white text-[12px] font-semibold disabled:opacity-50 hover:bg-[#1D4ED8]">{summBusy?'Working…':'Summarize via API'}</button><span className="text-[11px] text-zinc-500 self-center">POST /api/browser/summarize — Ollama + extractive fallback</span></div>
              {summary&&(<div className="rounded-xl bg-[#2563EB]/[0.06] border border-[#2563EB]/20 p-3 text-[13px] leading-6 whitespace-pre-wrap break-words">{summary}</div>)}
              {summErr&&(<div className="rounded-xl bg-red-50 border border-red-200 p-3 text-[13px] text-red-700 break-words">{summErr}</div>)}
            </div>
          </div>

          {/* BrowserFrame iframe */}
          <div className="relative w-full max-w-full overflow-hidden rounded-[24px] min-w-0">
            <div className="rounded-[20px] border border-zinc-200 bg-white shadow-[0_24px_80px_-24px_rgba(0,0,0,0.25),0_8px_24px_-12px_rgba(0,0,0,0.12)] overflow-hidden w-full max-w-full">
              <div className="h-9 flex items-center gap-2 px-3 border-b border-zinc-100 bg-zinc-50/70 overflow-hidden">
                <div className="flex gap-1.5 shrink-0"><span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57] border border-black/10"/><span className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E] border border-black/10"/><span className="h-2.5 w-2.5 rounded-full bg-[#28C840] border border-black/10"/></div>
                <div className="flex-1 min-w-0 flex items-center gap-2 rounded-full bg-white border border-zinc-200 h-7 px-3 text-[12px]"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0"/><span className="opacity-60 truncate">{activeUrl}</span><span className="ml-auto hidden sm:inline-flex items-center gap-1 text-[11px] font-medium bg-[#2563EB] text-white rounded-full px-2 h-5 shrink-0"><Sparkles className="h-3 w-3"/> Hostamar AI</span></div>
              </div>
              <div className="grid md:grid-cols-[1fr_300px] min-h-[420px] max-w-full overflow-hidden">
                <div className="border-r border-zinc-100 flex flex-col min-w-0 bg-white">
                  <iframe key={frameKey} ref={iframeRef} src={activeUrl} sandbox="allow-scripts allow-same-origin allow-forms" title="BrowserFrame" className="w-full h-[420px] border-0 bg-white"/>
                  <div className="p-2 border-t border-zinc-100 flex flex-wrap gap-1.5 text-[11px]">
                    <span className="px-2 py-1 rounded-full bg-zinc-900 text-white">Summarize</span><span className="px-2 py-1 rounded-full border">Translate to বাংলা</span><span className="px-2 py-1 rounded-full border">Ask AI</span>
                    <span className="ml-auto text-zinc-400 hidden sm:inline">sandbox allow-scripts • 320px clean</span>
                  </div>
                </div>
                <div className="bg-[#FFFFFF] flex flex-col min-w-0 border-t md:border-t-0 border-zinc-100">
                  <div className="flex items-center gap-1.5 px-3 h-10 border-b border-zinc-200/70 text-[12px] font-medium shrink-0">
                    <button onClick={()=>setTab("summary")} className={`h-6 px-2.5 rounded-full transition ${tab==="summary" ? "bg-zinc-900 text-white" : "border border-zinc-200/60 hover:bg-white"}`}>সারাংশ</button>
                    <button onClick={()=>setTab("chat")} className={`h-6 px-2.5 rounded-full transition ${tab==="chat" ? "bg-zinc-900 text-white" : "border border-transparent hover:border-zinc-200 hover:bg-white"}`}>Chat</button>
                    <button onClick={()=>setTab("translate")} className={`h-6 px-2.5 rounded-full transition ${tab==="translate" ? "bg-zinc-900 text-white" : "border border-transparent hover:border-zinc-200 hover:bg-white"}`}>Translate</button>
                  </div>
                  <div className="p-4 space-y-3 overflow-auto flex-1 min-w-0">
                    {tab==="summary" && (
                      <div className="rounded-2xl bg-white border border-zinc-200 p-3.5 shadow-sm">
                        <div className="flex items-center gap-2 text-[11px] font-semibold opacity-60"><Sparkles className="h-3.5 w-3.5 text-[#2563EB]"/> বাংলা সারাংশ • 10 lines</div>
                        {summary ? <div className="mt-2 text-[13px] leading-6 whitespace-pre-wrap break-words">{summary}</div> : <ul className="mt-2.5 space-y-2 text-[13px] leading-[1.65] font-bangla opacity-80"><li className="flex gap-2"><span className="text-[#2563EB]">•</span> URL load করুন → Extract Page Context → Summarize</li><li className="flex gap-2"><span className="text-[#2563EB]">•</span> Cross-origin হলে textarea তে text paste করুন</li><li className="flex gap-2"><span className="text-[#2563EB]">•</span> /api/browser/summarize → Ollama or extractive fallback</li></ul>}
                        {summErr&&<div className="mt-2 text-[12px] text-red-600 break-words">{summErr}</div>}
                      </div>
                    )}
                    {tab==="chat" && (<div className="rounded-2xl bg-white border border-zinc-200 p-3.5 shadow-sm"><div className="text-[12px] font-semibold opacity-60">AI Chat with Page</div><p className="mt-2 text-[13px] leading-6 opacity-70">এই পেজ নিয়ে প্রশ্ন করুন — সোর্স হাইলাইট সহ উত্তর।</p><div className="mt-3 rounded-xl bg-zinc-50 border p-3 text-[13px]">উদাহরণ: “এই আর্টিকেলের limitation কী?”</div></div>)}
                    {tab==="translate" && (<div className="rounded-2xl bg-white border border-zinc-200 p-3.5 shadow-sm"><div className="text-[12px] font-semibold opacity-60">Full Page Translate</div><p className="mt-2 text-[13px] leading-6 opacity-70">NLLB-200 দিয়ে প্রাকৃতিক বাংলা অনুবাদ — layout intact।</p><div className="mt-3 flex gap-2 text-[11px]"><span className="px-2.5 h-6 rounded-full bg-zinc-100 border grid place-items-center">Original</span><span className="px-2.5 h-6 rounded-full bg-[#2563EB] text-white grid place-items-center">বাংলা ✓</span></div></div>)}
                    <div className="rounded-2xl bg-zinc-900 text-zinc-100 p-3.5"><div className="text-[11px] opacity-60 flex items-center gap-1.5"><Play className="h-3 w-3"/> YouTube Transcript</div><div className="mt-2 h-8 rounded-full bg-white/10 flex items-center px-3 text-[12px] gap-2"><div className="h-2 w-2 rounded-full bg-red-500"/><div className="h-1 flex-1 rounded-full bg-white/20"><div className="h-1 w-[42%] rounded-full bg-white"/></div><span className="opacity-60 text-[11px]">02:14</span></div></div>
                  </div>
                  <div className="mt-auto p-3 border-t border-zinc-200 bg-white/70 backdrop-blur">
                    <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white h-10 px-3 shadow-sm"><MessageCircle className="h-4 w-4 opacity-50 shrink-0"/><input placeholder="এই পেজ নিয়ে প্রশ্ন করুন…" className="flex-1 bg-transparent outline-none text-[13px] placeholder:opacity-50 font-bangla min-w-0"/><button onClick={doSummarize} aria-label="Summarize" className="h-7 w-7 grid place-items-center rounded-full bg-[#2563EB] text-white"><ArrowUpRight className="h-4 w-4"/></button></div>
                    <div className="mt-2 text-[10.5px] opacity-50 text-center font-bangla">Connected to /api/browser/summarize</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Single sticky CTA — only one */}
      <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur border-t border-zinc-200 overflow-x-hidden">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6 h-[64px] flex items-center justify-between gap-3 min-w-0">
          <div className="text-[13px] font-bangla min-w-0 truncate"><b>BrowserFrame</b> <span className="hidden sm:inline text-zinc-500">• URL → iframe → Extract → Summarize • bKash</span></div>
          <a href="#top" onClick={(e)=>{e.preventDefault(); setActiveUrl(normalize(url.trim())); setFrameKey(k=>k+1)}} className="h-10 px-6 rounded-full bg-[#2563EB] text-white font-semibold text-[14px] inline-flex items-center justify-center shrink-0 hover:bg-[#1D4ED8]">Summarize this page →</a>
        </div>
      </div>
    </div>
  )
}
