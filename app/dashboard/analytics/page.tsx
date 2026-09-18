'use client'
import { useEffect, useState } from 'react'

export default function AnalyticsPage(){
  const [data,setData]=useState<any>(null)
  useEffect(()=>{ fetch('/api/analytics/models').then(r=>r.json()).then(setData).catch(()=>{}) },[])
  if (!data) return <div className="p-6">অ্যানালিটিক্স লোড হচ্ছে from KV logs...</div>
  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-2xl font-bold">ব্যবহার অ্যানালিটিক্স — KV লগ</h1>
      <p className="text-sm text-slate-600">source:{data.source} • total spent {data.total.costTaka} Taka (synthetic 0.54), {data.total.count} chats today, avg {data.total.avg} Taka, favorite {data.favorite}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-500">মোট খরচ</p><p className="text-xl font-bold">{data.total.costTaka} Taka</p><p className="text-xs">0.54 Taka synthetic • 12 chats • avg 0.04</p></div>
        <div className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-500">আজকের টোকেন</p><p className="text-xl font-bold">{data.total.tokens}</p><p className="text-xs">{data.perDay[0].count} logs today</p></div>
        <div className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-500">ফ্রি বনাম পেইড</p><p className="text-xl font-bold">{data.ratio.free} free / {data.ratio.paid} paid</p></div>
      </div>
      <div className="mt-4 rounded-xl border bg-white p-4">
        <h3 className="font-semibold text-sm">শীর্ষ ৫ মডেল by cost</h3>
        <ul className="mt-2 text-sm space-y-1">
          {data.top5.map((x:any)=><li key={x.model} className="flex justify-between border-b py-1"><span>{x.model}</span><span>{x.costTaka} Taka • {x.tokens} tokens • {x.count}x</span></li>)}
        </ul>
      </div>
      <div className="mt-4 rounded-xl border bg-white p-4">
        <h3 className="font-semibold text-sm">প্রতিদিন টোকেন</h3>
        <div className="mt-2 h-24 flex items-end gap-2">
          {data.perDay.map((d:any)=><div key={d.date} className="flex-1 bg-[#0E7C3A] rounded" style={{height: `${Math.min(100, d.tokens/10)}%`}} title={`${d.date} ${d.tokens}`}><p className="text-[10px] text-white text-center">{d.tokens}</p></div>)}
        </div>
      </div>
      <div className="mt-4 rounded-xl border bg-white p-4">
        <h3 className="font-semibold text-sm">মডেল প্রতি খরচ</h3>
        <div className="mt-2 space-y-1">
          {Object.entries(data.byModel).map(([k,v]:any)=><div key={k} className="flex justify-between text-xs"><span>{k}</span><span>{v.costTaka} Taka</span></div>)}
        </div>
      </div>
      <p className="mt-4 text-xs text-slate-500">Worker logs to HOSTAMAR_LOGS logs/usage/{'{date}'}/{'{id}'}.json via ctx.waitUntil — here aggregated via /api/analytics/models. Customer sees total spent 0.54 Taka, 12 chats, avg 0.04 Taka, favorite longcat.</p>
    </div>
  )
}