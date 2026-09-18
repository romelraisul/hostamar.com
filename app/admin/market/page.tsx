'use client'
import { useEffect, useState } from 'react'
export default function AdminMarketPage(){
  const [data,setData]=useState<any>(null)
  const [msg,setMsg]=useState('')
  const load=()=> fetch('/api/market-adjust').then(r=>r.json()).then(setData).catch(()=>{})
  useEffect(()=>{ load() },[])
  const approve=async()=>{
    setMsg('Approving...')
    try {
      const r=await fetch('/api/admin/market-approve',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ suggestedPrice: data.suggestedPrice }) })
      const j=await r.json()
      setMsg(j.message||'Approved — /pricing updated')
    } catch(e:any){ setMsg(e.message) }
  }
  if (!data) return <div className="p-6">Loading market...</div>
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold">Admin — Market Auto-Adjust (approval-gated)</h1>
      <div className="mt-4 rounded-xl border bg-white p-4 text-sm">
        <p>Binance USDT/BDT: {data.binance.usdtBdt} ({data.binance.source})</p>
        <p>$HOSTA: ${data.hosta.price} • OpenRouter model costs live</p>
        <p className="mt-2 font-semibold">Current Starter: {data.currentPrice} Taka → Suggested: {data.suggestedPrice} Taka</p>
        <p>Diff: {data.diffPct}% — status: <span className={data.status==='pending_approval'?'text-amber-600 font-bold':'text-green-600'}>{data.status}</span></p>
        <p className="text-xs text-slate-500 mt-1">{data.note}</p>
        {data.status==='pending_approval' && <button onClick={approve} className="mt-3 rounded-full bg-[#0E7C3A] px-4 py-2 text-white text-sm font-semibold">Approve — update /pricing + Stripe/PayPal</button>}
        {msg && <p className="mt-2 text-sm text-[#0E7C3A]">{msg}</p>}
        <p className="mt-3 text-xs text-slate-500">Cron: /api/market-adjust daily • writes Neon market_adjustment pending_approval • human must Approve • logs to SeoEvent + Slack webhook if configured</p>
      </div>
    </div>
  )
}
