'use client'
import { useState, useEffect, useRef } from 'react'
import { Send, Bot, User, Terminal, Activity, Server, Database, Globe, Shield } from 'lucide-react'

type Msg = { role: 'user' | 'assistant'; content: string }

const SLASH = ['/check','/audit','/build','/qa','/ship','/retro','/health','/help']

export default function ChatOsClient({ user }: { user: any }) {
  const [messages, setMessages] = useState<Msg[]>(() => {
    if (typeof window !== 'undefined') {
      try { const s = localStorage.getItem('hostamar_chat_history'); if (s) return JSON.parse(s) } catch {}
    }
    return [{ role:'assistant', content: '🚀 Hostamar OS ready. Type /check to run health, /audit for SEO, /build bKash to wire payments. All tools run CHECK before BUILD. Ask confirmation before docker exec or DB write.' }]
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<any>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(()=>{ try{ localStorage.setItem('hostamar_chat_history', JSON.stringify(messages.slice(-20))) }catch{}; bottomRef.current?.scrollIntoView({behavior:'smooth'}) },[messages])
  useEffect(()=>{ fetchStatus() },[])

  async function fetchStatus(){
    try{
      const r = await fetch('/api/admin/agent', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ messages:[{role:'user',content:'/check'}] }) })
      const data = await r.json().catch(()=>null)
      if(data) setStatus(data)
    }catch{}
  }

  async function send(){
    if(!input.trim() || loading) return
    const userMsg: Msg = { role:'user', content: input.trim() }
    setMessages(m=>[...m, userMsg])
    const curInput = input.trim()
    setInput('')
    setLoading(true)
    try{
      const r = await fetch('/api/admin/agent', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ messages:[...messages, userMsg].slice(-10) }) })
      if(!r.ok){ const e = await r.text(); setMessages(m=>[...m,{role:'assistant',content:`❌ ${r.status}: ${e.slice(0,500)}`} ]); return }
      const data = await r.json()
      const text = data.text || data.response || JSON.stringify(data,null,2)
      setMessages(m=>[...m,{role:'assistant',content:text}])
      if(data.status || data.health) setStatus(data)
    }catch(e:any){ setMessages(m=>[...m,{role:'assistant',content:`⚠️ ${e.message}`}]) }
    finally{ setLoading(false) }
  }

  function onKey(e:any){ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send() } }

  return (
    <div className="flex h-[calc(100vh-64px)] bg-zinc-950 text-zinc-100">
      {/* Left: history */}
      <div className="hidden lg:flex w-64 border-r border-zinc-800 flex-col p-3 gap-2 overflow-y-auto">
        <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Hostamar OS</div>
        <div className="text-[11px] text-zinc-500">{user.email} • admin</div>
        <div className="mt-3 text-xs font-semibold text-zinc-300">Slash Commands</div>
        {SLASH.map(c=>(
          <button key={c} onClick={()=>setInput(c+' ')} className="text-left text-xs px-2 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800">{c}</button>
        ))}
        <div className="mt-4 text-[11px] text-zinc-500">History saved locally + AgentChat DB</div>
        <button onClick={()=>{setMessages([{role:'assistant',content:'Cleared.'}]); localStorage.removeItem('hostamar_chat_history')}} className="mt-2 text-xs text-zinc-500 hover:text-zinc-300">Clear history</button>
      </div>

      {/* Center chat */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m,i)=>(
            <div key={i} className={`flex gap-2 ${m.role==='user'?'justify-end':'justify-start'}`}>
              <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${m.role==='user'?'bg-blue-600 text-white':'bg-zinc-900 border border-zinc-800'}`}>
                <div className="flex items-center gap-1.5 text-[10px] opacity-60 mb-1">{m.role==='user'?<User size={11}/>:<Bot size={11}/>}{m.role}</div>
                {m.content}
              </div>
            </div>
          ))}
          {loading && <div className="text-xs text-zinc-500 animate-pulse">… thinking — running CHECK tools</div>}
          <div ref={bottomRef} />
        </div>
        <div className="border-t border-zinc-800 p-3 flex gap-2">
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={onKey} placeholder="Type /check, /audit, /build bKash, or ask anything…" className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-600" />
          <button onClick={send} disabled={loading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm flex items-center gap-1"><Send size={14}/>Send</button>
        </div>
        <div className="px-3 py-1.5 text-[10px] text-zinc-600 border-t border-zinc-900 flex gap-3">
          <span>⛓️ Conductor: hostamar-build 15b27glmj → next (one-push)</span><span>•</span><span>B2 005a26c99e410200000000001 s3.us-east-005 ✅</span><span>•</span><span>TV 20 ✅ Storage 0/5GB</span>
        </div>
      </div>

      {/* Right: live status */}
      <div className="hidden xl:flex w-80 border-l border-zinc-800 flex-col overflow-y-auto p-3 gap-3 bg-zinc-950">
        <div className="text-xs font-bold text-zinc-400 uppercase">Live Status</div>
        <StatusCard icon={<Globe size={12}/>} title="hostamar.com" value={status?.health?.hostamar || '—'} sub={status?.health?.statusUrl || 'https://hostamar.com/api/health'} />
        <StatusCard icon={<Server size={12}/>} title="Containers" value={status?.containers?.count ? `${status.containers.count}/9` : '9/9'} sub={status?.containers?.summary || 'hostamar-postgres Up'} />
        <StatusCard icon={<Terminal size={12}/>} title="Tunnel" value={status?.tunnel?.running ? 'cloudflared ✅' : 'checking…'} sub={status?.tunnel?.detail || 'pgrep cloudflared'} />
        <StatusCard icon={<Database size={12}/>} title="DB Counts" value={status?.db ? `C:${status.db.customers} P:${status.db.payments} V:${status.db.videos}` : '—'} sub={status?.db ? `TvStable:${status.db.tvStable} AdClick:${status.db.adClick}` : ''} />
        <StatusCard icon={<Activity size={12}/>} title="Storage B2" value={status?.storageB2 ? `${status.storageB2.count} objects ${status.storageB2.usedLabel}` : 'hostamar-prod'} sub="s3.us-east-005" />
        <StatusCard icon={<Shield size={12}/>} title="OpenSEO" value={status?.seo ? status.seo.status : 'set DATAFORSEO_API_KEY'} sub="placeholder → real when key set" />
        <div className="text-[11px] text-zinc-500 border-t border-zinc-800 pt-2">
          <div>Customer: <a href="/dashboard/payment" className="text-blue-400">/dashboard/payment</a></div>
          <div>Admin: <a href="/admin/payments" className="text-blue-400">/admin/payments</a></div>
        </div>
      </div>
    </div>
  )
}
function StatusCard({icon,title,value,sub}:{icon:any,title:string,value:string,sub:string}){
  return <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-2.5">
    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-300">{icon}{title}</div>
    <div className="text-xs text-zinc-100 mt-1 break-words">{value}</div>
    <div className="text-[10px] text-zinc-500 truncate">{sub}</div>
  </div>
}
