'use client'
import { useEffect, useState } from 'react'
import { ModelPicker, type CatalogModel, PongBadge } from '@/components/ModelPicker'

type Tier = 'S'|'A'|'B'
function tierOf(m: CatalogModel): Tier {
  if (m.id.includes('kimi-k3') || m.id.includes('k3')) return 'S'
  if (m.context_length>=1000000) return 'A'
  return 'B'
}

export default function ModelsPage() {
  const [models, setModels] = useState<CatalogModel[]>([])
  const [source, setSource] = useState('')
  const [selected, setSelected] = useState<string>('')
  const [chatRes, setChatRes] = useState<any>(null)
  const [err, setErr] = useState('')

  useEffect(()=>{
    fetch('https://ai.hostamar.com/v1/models').then(r=>r.json()).then(d=>{
      const list: CatalogModel[] = (d.data||[]).map((x:any)=>({ id:x.id, provider:x.owned_by||'hostamar', context:x.context||'?', context_length:x.context_length||0, free:!!x.free, displayName:x.display_name||x.id }))
      setModels(list); setSource(d.source||'kv')
      if (list.find(x=>x.id.includes('longcat'))) setSelected(list.find(x=>x.id.includes('longcat'))!.id)
    }).catch(()=>{})
    // fallback to generated catalog if edge down
    fetch('/api/v1/models').then(r=>r.json()).then(d=>{
      if (!models.length && d.data) {
        const list: CatalogModel[] = (d.data||[]).map((x:any)=>({ id:x.id, provider:x.owned_by||'hostamar', context:x.context||'?', context_length:x.context_length||0, free:!!x.free, displayName:x.display_name||x.id }))
        if (list.length) { setModels(list); setSource(d.source||'kv') }
      }
    }).catch(()=>{})
  }, [])

  const selModel = models.find(m=>m.id===selected)

  const tryChat = async () => {
    if (!selected) return
    setErr(''); setChatRes(null)
    // strip [ctx] + opencode/ via ROUTE_MAP logic — here just strip brackets
    const clean = selected.replace(/\s*\[[^\]]*\]\s*$/, '').replace(/^opencode\//,'')
    try {
      const r = await fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ model: clean, messages:[{role:'user', content:'ping in one word'}] }) })
      const j = await r.json()
      setChatRes(j)
    } catch(e:any){ setErr(e.message) }
  }

  const freeCount = models.filter(m=>m.free).length

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold">মডেল মার্কেটপ্লেস — ১২০ KV ক্যাটালগ</h1>
      <p className="text-sm text-slate-600">source:{source||'kv'} • {models.length} models • free {freeCount} • Tier S (Reasoning) kimi-k3 1M, Tier A Long 1M longcat 1,048,756 + gemini 1M, Tier B Balanced</p>

      <div className="mt-4">
        <ModelPicker value={selected} onChange={setSelected} models={models} />
      </div>

      {selModel && (
        <div className="mt-4 rounded-xl border bg-white p-4">
          <p className="font-semibold">{selModel.displayName} <PongBadge id={selModel.id} /> <span className="text-xs text-slate-500">[{selModel.context}] ctx {selModel.context_length?.toLocaleString()} • {selModel.provider} • {selModel.free?'FREE':'PAID 402'}</span></p>
          <p className="text-xs text-slate-500">Tier {tierOf(selModel)} • upstream {selModel.provider} • strip [ctx]+opencode/ → {selected.replace(/\s*\[[^\]]*\]\s*$/, '').replace(/^opencode\//,'')}</p>
          <button onClick={tryChat} className="mt-2 rounded-full bg-[#0E7C3A] px-4 py-1.5 text-sm font-semibold text-white">Select → chat pong</button>
          {chatRes && (
            <div className="mt-2 rounded bg-slate-50 p-2 text-xs">
              <p>reply: {chatRes.reply?.slice(0,200)}</p>
              <p>provider: {chatRes.provider} • costTaka {chatRes.costTaka} • creditsRemaining {chatRes.creditsRemaining} • usdtBdt {chatRes.usdtBdt} • fallbackFrom {chatRes.fallbackFrom||'—'} {chatRes.reply?.toLowerCase().includes('pong')?'PONG ✓':''}</p>
            </div>
          )}
          {err && <p className="text-xs text-red-600">{err}</p>}
        </div>
      )}

      <div className="mt-6 grid gap-2 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-3"><h3 className="font-semibold text-sm">Tier S Reasoning</h3><p className="text-xs text-slate-600">kimi-k3 1M • deepseek-v4 1.3M • Thinking</p></div>
        <div className="rounded-xl border bg-white p-3"><h3 className="font-semibold text-sm">Tier A Long Context</h3><p className="text-xs text-slate-600">longcat 1,048,756 • x-preview 1,048,576 • gemini 1M • ox-alpha PONG</p></div>
        <div className="rounded-xl border bg-white p-3"><h3 className="font-semibold text-sm">Tier B Balanced</h3><p className="text-xs text-slate-600">512K-256K • fast & cheap • 0.03-0.09 Taka/msg</p></div>
      </div>
    </div>
  )
}