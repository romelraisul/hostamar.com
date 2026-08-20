'use client'
import { useEffect, useState } from 'react'
export default function NodeStatus(){
  const [nodes,setNodes]=useState<any[]>([])
  useEffect(()=>{fetch('/api/dashboard/nodes').then(r=>r.json()).then(j=>setNodes(j.nodes||[])).catch(()=>{})},[])
  if(!nodes.length) return <div className="rounded-2xl border bg-white p-5 animate-pulse h-32" />
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-[#0F172A]">My Nodes</h3>
      <p className="text-xs text-[#64748B]">Windows/Linux/Mac/Phone → Cloudflare 6815:210e → hostamar.com</p>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {nodes.map((n:any)=>(
          <div key={n.id} className={`rounded-xl border p-3 ${n.status===200?'bg-[#ECFDF5] border-[#10B981]/30':'bg-red-50 border-red-200'}`}>
            <div className="text-xs font-bold">{n.label}</div>
            <div className={`text-sm font-mono ${n.status===200?'text-[#0E7C3A]':'text-red-600'}`}>{n.status} {n.statusText}</div>
            <div className="text-[11px] text-zinc-500">{n.ip} • {n.hint?.slice(0,40)}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl bg-black text-green-400 p-3 font-mono text-xs">
        cloudflared tunnel run hostamar-app<br/>python C:\hostamar\gateway.py
      </div>
    </div>
  )
}
