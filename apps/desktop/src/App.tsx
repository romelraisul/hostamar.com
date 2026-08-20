import { useState } from 'react'
export default function App() {
  const [tab, setTab] = useState<'dashboard'|'chat'|'browser'|'comfy'|'dev'|'nodes'>('dashboard')
  const [status, setStatus] = useState('OFFLINE')
  const [credits] = useState(6000)
  const pct = Math.round((credits/6000)*100)
  const tabs = ['dashboard','chat','browser','comfy','dev','nodes'] as const
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b bg-white sticky top-0 z-10">
        <span className="font-bold text-[#0E7C3A]">Hostamar Node</span>
        <span className={status==='ONLINE'?'text-[#0E7C3A] font-bold':'text-red-500'}>{status} • {credits}/6000</span>
      </header>
      <nav className="flex gap-1 px-2 py-2 border-b bg-white overflow-x-auto">
        {tabs.map(t=>(
          <button key={t} onClick={()=>setTab(t)} className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize ${tab===t?'bg-[#0E7C3A] text-white':'bg-zinc-100'}`}>{t}</button>
        ))}
      </nav>
      <div className="flex-1 overflow-auto">
        {tab==='dashboard' && (
          <div className="p-4">
            <div className="rounded-2xl bg-[#0E7C3A] text-white p-4"><div className="text-xs tracking-widest">CREDIT 6000/6000 {pct}%</div><div className="h-2 bg-white/20 rounded-full mt-2"><div className="h-full bg-white rounded-full" style={{width: pct+'%'}}/></div><div className="text-xs mt-2">Video 100 • Chat 1 • Browser 5 • IDE 10 • Game 20 • Hosting 0</div></div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={()=>setStatus('ONLINE')} className="rounded-full bg-[#0E7C3A] text-white py-2.5 font-bold">Start Tunnel</button>
              <button onClick={()=>setStatus('ONLINE')} className="rounded-full bg-[#2563EB] text-white py-2.5 font-bold">Start Gateway</button>
              <button className="rounded-full bg-[#F59E0B] text-white py-2.5 font-bold">Start Worker</button>
              <button onClick={()=>setStatus('OFFLINE')} className="rounded-full bg-zinc-200 py-2.5">Stop All</button>
            </div>
          </div>
        )}
        {tab==='dev' && (
          <div className="h-[600px]">
            <iframe src="http://127.0.0.1:3000/dev" className="w-full h-full border-0" title="Dev IDE" />
            <div className="text-xs text-center p-2 bg-zinc-900 text-white">Dev IDE via gateway.py — Monaco + Terminal + AI (credit 6000) — shell via Tauri plugin</div>
          </div>
        )}
        {tab!=='dashboard' && tab!=='dev' && (
          <div className="p-6 text-center text-zinc-500 text-sm">{tab} — coming via gateway http://127.0.0.1:3000/{tab}</div>
        )}
      </div>
    </div>
  )
}
