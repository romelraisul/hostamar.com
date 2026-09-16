'use client'
import { useEffect, useState } from 'react'
export default function AdminNodesPage(){
  const [nodes,setNodes]=useState<any[]>([])
  const [loading,setLoading]=useState(true)
  useEffect(()=>{fetch('/api/dashboard/nodes').then(r=>r.json()).then(j=>{setNodes(j.nodes||[]); setLoading(false)}).catch(()=>setLoading(false))},[])
  if(loading) return <div className="p-10 text-center text-[#57534E]">Loading nodes…</div>
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-xl font-bold text-[#1C1917]">Nodes — All Customer Devices</h1>
      <p className="text-sm text-[#78716C]">Windows/Linux/Mac/Android/iOS • Tailscale 100.x • 200/530 • Credit 6000</p>
      <div className="overflow-x-auto rounded-2xl bg-[#FFFDF6] border border-[#0E7C3A]/20">
        <table className="w-full text-sm">
          <thead className="bg-[#0E7C3A]/10 border-b border-[#0E7C3A]/20"><tr><th className="px-4 py-3 text-left text-[#78716C]">User / Device</th><th className="px-4 py-3 text-left text-[#78716C]">IP</th><th className="px-4 py-3 text-left text-[#78716C]">Status</th><th className="px-4 py-3 text-left text-[#78716C]">Uptime</th><th className="px-4 py-3 text-right text-[#78716C]">Actions</th></tr></thead>
          <tbody className="divide-y divide-[#D8CDB4]">
            {nodes.map((n:any)=>(
              <tr key={n.id} className="hover:bg-[#FDF8EC]/40">
                <td className="px-4 py-3 text-[#1C1917]">{n.label}</td>
                <td className="px-4 py-3 font-mono text-[#78716C]">{n.ip}</td>
                <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs border ${n.status===200?'bg-[#0E7C3A]/20 text-[#10B981] border-[#10B981]/30':'bg-red-500/20 text-red-300 border-red-500/30'}`}>{n.status} {n.statusText}</span></td>
                <td className="px-4 py-3 text-[#57534E]">{n.lastSeen ? new Date(n.lastSeen).toLocaleString() : '—'}</td>
                <td className="px-4 py-3 text-right"><button className="px-3 py-1.5 rounded-lg bg-[#FDF8EC] border border-[#D8CDB4] text-xs text-[#57534E]">Restart Tunnel</button> <button className="px-3 py-1.5 rounded-lg bg-[#FDF8EC] border border-[#D8CDB4] text-xs text-[#57534E]">View Logs</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 font-mono text-xs text-amber-200">
        Correct: cloudflared tunnel run hostamar-app • python C:\hostamar\gateway.py • Tailscale 100.x mesh, no JumpServer
      </div>
    </div>
  )
}
