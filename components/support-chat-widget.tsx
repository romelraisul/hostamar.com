'use client'
import { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send, Bot, Sparkles } from 'lucide-react'

type Msg = { role:'user'|'assistant', content:string }

export default function SupportChatWidget(){
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>(()=>{
    if(typeof window==='undefined') return [{role:'assistant',content:'হাই! আমি Hostamar Support — Google Gemini 🤖\n\nbKash 01822417463, Storage 5GB, TV 3700 চ্যানেল — কী সাহায্য লাগবে?'}]
    try{ const s=localStorage.getItem('hostamar_support_chat'); if(s) return JSON.parse(s) }catch{}
    return [{role:'assistant',content:'হাই! আমি Hostamar Support — Google Gemini 🤖\n\nbKash 01822417463, Storage 5GB, TV 3700 চ্যানেল — কী সাহায্য লাগবে?'}]
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(()=>{ try{ localStorage.setItem('hostamar_support_chat', JSON.stringify(msgs.slice(-20))) }catch{}; bottomRef.current?.scrollIntoView({behavior:'smooth'}) },[msgs])

  async function send(text?:string){
    const t = (text || input).trim()
    if(!t || loading) return
    const user:Msg={role:'user',content:t}
      if(t.includes('Reel')||t.includes('রিল')){ try{ window.location.href='/dashboard/reel' }catch{} return }
    setMsgs(m=>[...m,user]); setInput(''); setLoading(true)
    try{
      const r = await fetch('/api/support/chat',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({messages:[...msgs,user]})})
      const j = await r.json().catch(()=>({}))
      const reply = j.reply || j.text || j.content || (j.error ? `❌ ${j.error}` : JSON.stringify(j).slice(0,500))
      const model = j.model ? ` — ${j.model} via ${j.provider||'gateway'}` : ''
      setMsgs(m=>[...m,{role:'assistant',content: reply + (model ? `\n\n _${model}_` : '')}])
    }catch(e:any){ setMsgs(m=>[...m,{role:'assistant',content:`⚠️ ${e.message} — try again or visit /support`}]) }
    finally{ setLoading(false) }
  }

  return (
    <>
      {/* Floating button */}
      <button onClick={()=>setOpen(o=>!o)} aria-label="Support chat" className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-[#0E7C3A] to-[#10B981] text-white shadow-xl flex items-center justify-center hover:scale-105 transition">
        {open ? <X size={22}/> : <MessageCircle size={24}/>}
      </button>
      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 right-5 z-50 w-[350px] h-[500px] max-w-[92vw] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-[#0E7C3A] to-[#10B981] text-white flex items-center gap-2">
            <Bot size={18}/><span className="font-bold text-sm">Hostamar Support — AI (Google Gemini)</span><Sparkles size={14} className="ml-auto opacity-70"/>
          </div>
          <div className="flex gap-1.5 px-2 py-1.5 bg-zinc-900 border-b border-zinc-800 overflow-x-auto">
            {['Reel বানাও','bKash payment','Storage help','TV not playing','Pricing'].map(q=>(
              <button key={q} onClick={()=>send(q)} className="text-[11px] px-2 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 whitespace-nowrap">{q}</button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-zinc-950">
            {msgs.map((m,i)=>(
              <div key={i} className={`flex ${m.role==='user'?'justify-end':'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-[13px] whitespace-pre-wrap break-words ${m.role==='user'?'bg-blue-600 text-white':'bg-zinc-900 border border-zinc-800 text-zinc-100'}`}>{m.content}</div>
              </div>
            ))}
            {loading && <div className="text-xs text-zinc-500 animate-pulse">Gemini typing…</div>}
            <div ref={bottomRef}/>
          </div>
          <div className="p-2 border-t border-zinc-800 flex gap-2 bg-zinc-900">
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}} placeholder="Ask in Bangla or English…" className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#10B981]"/>
            <button onClick={()=>send()} disabled={loading} className="px-3 py-2 bg-[#0E7C3A] hover:bg-[#10B981] disabled:opacity-50 rounded-lg text-white"><Send size={16}/></button>
          </div>
          <div className="px-3 py-1 text-[10px] text-zinc-600 text-center">bKash 01822417463 • /dashboard/payment • /support</div>
        </div>
      )}
    </>
  )
}
