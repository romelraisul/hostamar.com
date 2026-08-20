import { useState, useEffect } from 'react'
export default function App() {
  const [status, setStatus] = useState('OFFLINE')
  const [logs, setLogs] = useState<string[]>(['Fix: use cloudflared tunnel run hostamar-app (NOT --name)','Fix: python C:\\hostamar\\gateway.py (not C:\\Users\\User\\)'])
  const [credits] = useState(6000)
  const pct = Math.round((credits/6000)*100)
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] p-6">
      <header className="flex items-center justify-between"><span className="font-bold text-[#0E7C3A]">Hostamar Node</span><span className={status==='ONLINE'?'text-[#0E7C3A]':'text-red-500'}>{status}</span></header>
      <div className="mt-4 rounded-2xl bg-[#0E7C3A] text-white p-5"><div className="text-xs tracking-widest">CREDIT 6000/6000 {pct}%</div><div className="h-2 bg-white/20 rounded-full mt-2"><div className="h-full bg-white rounded-full" style={{width: pct+'%'}}/></div><div className="text-xs mt-2">Video 100 • Chat 1 • Browser 5 • IDE 10 • Game 20 • Hosting 0</div></div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button onClick={()=>setStatus('ONLINE')} className="rounded-full bg-[#0E7C3A] text-white py-2.5 font-bold">Start Tunnel</button>
        <button onClick={()=>setStatus('ONLINE')} className="rounded-full bg-[#2563EB] text-white py-2.5 font-bold">Start Gateway</button>
        <button className="rounded-full bg-[#F59E0B] text-white py-2.5 font-bold">Start Worker</button>
        <button onClick={()=>setStatus('OFFLINE')} className="rounded-full bg-zinc-200 py-2.5">Stop All</button>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <span className="rounded-xl border p-3 text-center">Windows<br/><span className={status==='ONLINE'?'text-green-600':'text-red-500'}>{status}</span></span>
        <span className="rounded-xl border p-3 text-center">AI Gateway<br/><span className="text-[#0E7C3A]">200 LIVE 93</span></span>
        <span className="rounded-xl border p-3 text-center">6 Products<br/><span>Video Hosting Chat Browser IDE Game</span></span>
      </div>
      <pre className="mt-4 rounded-xl bg-black text-green-400 p-3 text-xs h-32 overflow-auto">{logs.join('\n')}</pre>
      <p className="text-xs text-zinc-500 mt-2">Auto-start: Task Scheduler (Windows) · systemd hostamar-node.service (Linux) · LaunchAgent (Mac)</p>
    </div>
  )
}
