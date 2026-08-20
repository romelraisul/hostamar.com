'use client'
import { useEffect, useRef, useState } from 'react'
interface Msg { role:'user'|'assistant'; content:string }
const SUGGESTIONS = ['প্ল্যান কোনটা সেরা?','AI ভিডিও কিভাবে বানাবো?','bKash দিয়ে পেমেন্ট কি?','ফ্রি প্ল্যানে কী আছে?']
export default function SupportWidget(){
  const [open,setOpen]=useState(false)
  const [msgs,setMsgs]=useState<Msg[]>([{role:'assistant',content:'আসসালামু আলাইকুম! আমি Hostamar-এর AI সাপোর্ট। ৬টি পণ্য, প্ল্যান বা পেমেন্ট নিয়ে যেকোনো প্রশ্ন করুন। 🇧🇩'}])
  const [input,setInput]=useState('')
  const [busy,setBusy]=useState(false)
  const scrollRef=useRef<HTMLDivElement>(null)
  useEffect(()=>{ scrollRef.current?.scrollTo({top:scrollRef.current.scrollHeight,behavior:'smooth'}) },[msgs,busy])
  async function send(text:string){
    const q=text.trim(); if(!q||busy) return
    setInput(''); const next:Msg[]=[...msgs,{role:'user',content:q}]
    setMsgs(next); setBusy(true)
    try{
      const res=await fetch('/api/support-chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q,history:next.map(m=>({role:m.role,content:m.content}))})})
      const data=await res.json()
      setMsgs(m=>[...m,{role:'assistant',content:data.reply||'উত্তর পাওয়া যায়নি।'}])
    }catch{ setMsgs(m=>[...m,{role:'assistant',content:'নেটওয়ার্ক সমস্যা। কিছুক্ষণ পর আবার চেষ্টা করুন।'}]) } finally{ setBusy(false) }
  }
  return (
    <>
      <button aria-label="AI সাপোর্ট খুলুন" onClick={()=>setOpen(o=>!o)} className="fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-[#2563EB] text-2xl text-white shadow-[0_10px_30px_-10px_rgba(37,99,235,0.8)] transition hover:bg-[#1D4ED8]">{open?'×':'💬'}</button>
      {open&&(
        <div className="fixed bottom-24 right-5 z-[60] flex h-[30rem] w-[min(22rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
          <div className="flex items-center gap-2 bg-[#2563EB] px-4 py-3 text-white">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white/20 text-lg">🤖</span>
            <div className="leading-tight"><div className="font-semibold">Hostamar AI সাপোর্ট</div><div className="text-[11px] text-white/80">Messenger till 11pm • 100 msg/day</div></div>
          </div>
          <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-[#FCFCF9] p-3">
            {msgs.map((m,i)=>(
              <div key={i} className={m.role==='user'?'flex justify-end':'flex justify-start'}>
                <div className={m.role==='user'?'max-w-[85%] rounded-2xl rounded-br-sm bg-[#2563EB] px-3 py-2 text-[14px] text-white':'max-w-[85%] rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-[14px] text-zinc-800 shadow-sm'}>{m.content}</div>
              </div>
            ))}
            {busy&&(
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-white px-3 py-2 shadow-sm flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.2s]"/><span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.1s]"/><span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce"/>
                  <span className="text-[11px] text-zinc-500 ml-1">টাইপ করছে…</span>
                </div>
              </div>
            )}
          </div>
          {msgs.length<=1&&(
            <div className="flex flex-wrap gap-1.5 border-t border-zinc-100 bg-white px-3 py-2">
              {SUGGESTIONS.map(s=><button key={s} onClick={()=>send(s)} className="rounded-full border border-zinc-200 px-2.5 py-1 text-[12px] text-zinc-600 hover:border-[#2563EB] hover:text-[#2563EB]">{s}</button>)}
            </div>
          )}
          <form onSubmit={e=>{e.preventDefault();send(input)}} className="flex items-center gap-2 border-t border-zinc-200 bg-white p-2">
            <input value={input} onChange={e=>setInput(e.target.value)} placeholder="আপনার প্রশ্ন লিখুন…" className="flex-1 rounded-full bg-zinc-100 px-4 py-2 text-[14px] outline-none focus:ring-2 focus:ring-[#2563EB]/30" />
            <button type="submit" disabled={busy} className="grid h-9 w-9 place-items-center rounded-full bg-[#2563EB] text-white disabled:opacity-50">➤</button>
          </form>
        </div>
      )}
    </>
  )
}
