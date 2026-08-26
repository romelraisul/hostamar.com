'use client'
import { useEffect, useState } from 'react'

export type CatalogModel = { id: string; provider: string; context: string; context_length: number; free: boolean; displayName: string; owned_by?: string }

const PONG = new Set(['meituan/longcat-2.0-free','minimax/minimax-m3:free','stealth/ox-alpha','minimax/minimax-m3','minimaxai/minimax-m3','moonshotai/kimi-k3','opencode/x-preview-f-free'])

export function PongBadge({ id }: { id: string }) {
  if (!PONG.has(id) && !id.includes('longcat') && !id.includes('ox-alpha') && !id.includes('minimax')) return null
  return <span className="ml-1 rounded-full bg-[#0E7C3A] px-1.5 py-0.5 text-[9px] font-bold text-white">PONG</span>
}

export function ModelPicker({ value, onChange, models, loading }: { value: string; onChange: (id:string)=>void; models: CatalogModel[]; loading?: boolean }) {
  const [q, setQ] = useState('')
  const [ctx, setCtx] = useState('all')
  const [free, setFree] = useState<'all'|'free'|'paid'>('all')
  const [prov, setProv] = useState('all')

  const filtered = models.filter(m=>{
    if (q && !m.id.toLowerCase().includes(q.toLowerCase()) && !m.displayName.toLowerCase().includes(q.toLowerCase())) return false
    if (ctx!=='all' && m.context!==ctx) return false
    if (free==='free' && !m.free) return false
    if (free==='paid' && m.free) return false
    if (prov!=='all' && m.provider!==prov) return false
    return true
  })

  const providers = [...new Set(models.map(m=>m.provider))].sort()
  const ctxs = [...new Set(models.map(m=>m.context))].sort((a,b)=>{
    const n=(s:string)=> s.endsWith('M')?parseFloat(s)*1000000 : s.endsWith('K')?parseFloat(s)*1000:0
    return n(b)-n(a)
  })

  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="flex flex-wrap gap-2 mb-2">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search longcat, kimi-k3, 1M..." className="flex-1 min-w-[160px] rounded-lg border px-2 py-1.5 text-sm" />
        <select value={ctx} onChange={e=>setCtx(e.target.value)} className="rounded-lg border px-2 py-1.5 text-sm">
          <option value="all">All ctx</option>
          {ctxs.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select value={free} onChange={e=>setFree(e.target.value as any)} className="rounded-lg border px-2 py-1.5 text-sm">
          <option value="all">Free+Paid</option>
          <option value="free">29 Free only</option>
          <option value="paid">Paid (402 blocked but visible)</option>
        </select>
        <select value={prov} onChange={e=>setProv(e.target.value)} className="rounded-lg border px-2 py-1.5 text-sm">
          <option value="all">All providers</option>
          {providers.map(p=><option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      {loading ? <p className="text-sm text-slate-500">Loading 120 KV...</p> : <p className="text-xs text-slate-500 mb-2">{filtered.length} / {models.length} models — source:kv</p>}
      <div className="max-h-[280px] overflow-auto grid gap-1 sm:grid-cols-2">
        {filtered.map(m=>(
          <button key={m.id} onClick={()=>onChange(m.id)} className={`text-left rounded-lg border px-2 py-1.5 text-xs flex items-center justify-between ${value===m.id?'bg-[#0E7C3A] text-white border-[#0E7C3A]':'bg-white hover:bg-slate-50'}`}>
            <span className="truncate pr-2">{m.displayName}<PongBadge id={m.id} /></span>
            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] ${m.free?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}`}>{m.free?'FREE':'PAID'}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
