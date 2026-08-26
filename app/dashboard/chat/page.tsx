'use client'
import { useEffect, useRef, useState } from 'react'
import { Send, Sparkles, Coins } from 'lucide-react'
import { ModelPicker, type CatalogModel } from '@/components/ModelPicker'

type Msg = { role: 'user' | 'assistant'; content: string; model?: string; cost?: number; tokens?: { p: number; c: number }; provider?: string; fallbackFrom?: string; usdtBdt?: number; creditsRemaining?: number }

export default function ChatPage() {
  const [bal, setBal] = useState<{ credits: number; usd: number } | null>(null)
  const [rate, setRate] = useState<number>(126.24)
  const [models, setModels] = useState<CatalogModel[]>([])
  const [modelId, setModelId] = useState('meituan/longcat-2.0-free')
  const [input, setInput] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/credits/balance').then(r=>r.json()).then(d=>{
      if (d?.balance) fetch('/api/binance-price').then(r=>r.json()).then(p=>{ setRate(p.usdtBdt||126.24); setBal({ credits: d.balance.credits, usd: d.balance.credits / (p.usdtBdt||126.24) }) }).catch(()=>setBal({credits:d.balance.credits, usd:d.balance.credits/126.24}))
    }).catch(()=>{})
    fetch('https://ai.hostamar.com/v1/models').then(r=>r.json()).then(d=>{
      const list: CatalogModel[] = (d.data||[]).map((x:any)=>({ id:x.id, provider:x.owned_by||'hostamar', context:x.context||'?', context_length:x.context_length||0, free:!!x.free, displayName:x.display_name||x.id }))
      setModels(list)
    }).catch(()=> fetch('/api/v1/models').then(r=>r.json()).then(d=>{
      const list: CatalogModel[] = (d.data||[]).map((x:any)=>({ id:x.id, provider:x.owned_by||'hostamar', context:x.context||'?', context_length:x.context_length||0, free:!!x.free, displayName:x.display_name||x.id }))
      if (list.length) setModels(list)
    }).catch(()=>{}))
  }, [])
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:'smooth'}) }, [msgs,busy])

  const estCost = (txt:string)=> Math.max(0.03, Math.round((txt.length/4/1000)*0.5*100)/100)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()||busy) return
    setError(null)
    const text=input.trim(); setInput('')
    const next: Msg[]=[...msgs,{role:'user', content:text}]
    setMsgs(next); setBusy(true)
    try {
      const clean = modelId.replace(/\s*\[[^\]]*\]\s*$/, '').replace(/^opencode\//,'')
      const res=await fetch('/api/chat',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ model: clean, messages: next.map(m=>({role:m.role, content:m.content})) }) })
      const data=await res.json()
      if (!res.ok) setError(data?.error?.message||data?.error||'Chat failed')
      else {
        setMsgs(m=>[...m,{ role:'assistant', content:data.reply, model:data.model, cost:data.costTaka, tokens:data.tokens, provider:data.provider, fallbackFrom:data.fallbackFrom, usdtBdt:data.usdtBdt, creditsRemaining:data.creditsRemaining }])
        if (typeof data.creditsRemaining==='number') setBal({ credits:data.creditsRemaining, usd: data.creditsRemaining/rate })
      }
    } catch(e:any){ setError(e?.message||'Network error') }
    finally{ setBusy(false) }
  }

  const sel = models.find(m=>m.id===modelId)
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-3 p-3">
      <header className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white p-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#0E7C3A]" />
          <span className="text-sm font-bold">Hostamar AI চ্যাট — 120 KV</span>
          <span className="rounded-full bg-[#0E7C3A]/10 px-2 py-0.5 text-[10px] font-semibold text-[#0E7C3A]">$HOSTA ready</span>
          {sel && <span className="text-xs text-slate-500">{sel.displayName} • {sel.provider} {sel.free?'FREE':'PAID'} {sel.id.includes('longcat')||sel.id.includes('ox-alpha')?'PONG':''}</span>}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Coins className="h-4 w-4 text-[#F59E0B]" />
          <span className="font-bold text-[#0F172A]">{bal?`${bal.credits.toLocaleString()} Taka ≈ $${bal.usd.toFixed(2)} @ ${rate} BDT`:'—'}</span>
        </div>
      </header>

      <ModelPicker value={modelId} onChange={setModelId} models={models.length?models:[{id:'meituan/longcat-2.0-free', provider:'kilo', context:'1M', context_length:1048756, free:true, displayName:'meituan/longcat-2.0-free [1M]'}]} />

      <div className="flex-1 overflow-y-auto rounded-xl border bg-white p-4 space-y-3">
        {msgs.length===0 && (
          <div className="flex h-full flex-col items-center justify-center text-center text-sm text-slate-500">
            <p className="mb-1 font-semibold text-slate-700">চ্যাট শুরু করুন — 120 models marketplace</p>
            <p>5999.46 Taka ≈ $47.53 (Binance 126.24) • Enter to send • est {estCost(input)} Taka/msg • provider kilo-edge • PONG</p>
            <p className="mt-1 text-xs">1 Credit = 1 Taka = future 1 $HOSTA. Try longcat pong → 0.03 Taka</p>
          </div>
        )}
        {msgs.map((m,i)=>(
          <div key={i} className={m.role==='user'?'flex justify-end':''}>
            <div className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${m.role==='user'?'bg-[#0E7C3A] text-white':'bg-slate-100 text-slate-800'}`}>
              <p>{m.content}</p>
              {m.role==='assistant' && m.cost!=null && (
                <p className="mt-1 text-[10px] opacity-60">{m.model?.split('/').pop()} • {m.provider||'kilo-edge'} {m.fallbackFrom?`(fallback from ${m.fallbackFrom}→minimax-m3)`:''} • {m.tokens?.p}+{m.tokens?.c} tokens • {m.cost} Taka • {m.creditsRemaining} credits • usdtBdt {m.usdtBdt||rate} PONG</p>
              )}
            </div>
          </div>
        ))}
        {busy && <p className="text-xs text-slate-400">Thinking… kilo-edge</p>}
        {error && <p className="rounded bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="flex items-end gap-2">
        <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(e as any) } }} rows={2} placeholder="কিছু জিজ্ঞাসা করুন — est 0.05 Taka/msg — 1 Credit = 1 Taka" className="flex-1 resize-none rounded-xl border bg-white p-3 text-sm outline-none focus:border-[#0E7C3A]" />
        <button type="submit" disabled={busy||!input.trim()} className="rounded-xl bg-[#0E7C3A] p-3 text-white disabled:opacity-50"><Send className="h-4 w-4" /></button>
      </form>
      {input && <p className="text-xs text-slate-500">Estimated cost as you type: {estCost(input)} Taka/msg • dual balance 5999.46 ≈ $47.53</p>}
    </div>
  )
}
