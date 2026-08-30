'use client'

import { useEffect, useState } from 'react'

const GAMES = [
  { id: 'minecraft', name: 'Minecraft', icon: '⛏️', ram: '2GB', cpu: '1 vCPU', price: 20 },
  { id: 'cs2', name: 'CS2', icon: '🔫', ram: '4GB', cpu: '2 vCPU', price: 40 },
  { id: 'valorant', name: 'Valorant', icon: '🎯', ram: '4GB', cpu: '2 vCPU', price: 50 },
  { id: 'gta5', name: 'GTA V', icon: '🚗', ram: '8GB', cpu: '4 vCPU', price: 80 },
]

export default function GameClient() {
  const [servers, setServers] = useState<any[]>([])
  const [running, setRunning] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const res = await fetch('/api/game', { credentials: 'include' })
      const data = await res.json()
      if (res.ok) {
        setServers(data.servers || [])
        const st: Record<string, boolean> = {}
        ;(data.servers || []).forEach((s: any) => { st[s.id] = s.status === 'running' || s.status === 'processing' })
        setRunning(st)
      }
    } catch {} finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const act = async (gameId: string, action: 'start' | 'stop') => {
    setBusy(gameId + action); setMsg('')
    try {
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ gameId, action }),
      })
      const data = await res.json()
      if (res.status === 401) { window.location.href = '/login'; return }
      if (res.status === 402) { setMsg(`ক্রেডিট লাগবে ${data.needed}cr — ব্যালেন্স ${data.balance}cr। টপ-আপ: bKash ${data.bkash}`); return }
      if (!res.ok || !data.success) { setMsg(data.error || 'ব্যর্থ'); return }
      setRunning(r => ({ ...r, [gameId]: action === 'start' }))
      setMsg(action === 'start' ? `✅ ${gameId} সার্ভার চালু — ফ্রি` : `⏹ ${gameId} বন্ধ হয়েছে`)
      load()
    } catch { setMsg('নেটওয়ার্ক সমস্যা') } finally { setBusy('') }
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">গেম হোস্টিং 🎮</h1>
          <p className="mt-1 text-sm text-zinc-500">Minecraft, CS2, Valorant, GTA V — Start/Stop ক্রেডিটে, ২৪/৭ অনলাইন</p>
        </div>
        <a href="/dashboard/services/new?type=game" className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700">+ নতুন সার্ভার</a>
      </div>

      {msg && <div className="mt-4 rounded-lg bg-[#ECFDF5] p-3 text-sm text-[#0E7C3A]">{msg}</div>}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {GAMES.map(g => (
          <div key={g.id} className="rounded-xl border bg-white p-5">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{g.icon}</span>
              <div className="flex-1">
                <h3 className="font-semibold">{g.name}</h3>
                <p className="text-xs text-zinc-500">{g.ram} RAM • {g.cpu}</p>
              </div>
              <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600">ফ্রি</span>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => act(g.id, 'start')}
                disabled={busy === g.id + 'start' || running[g.id]}
                className="flex-1 rounded-lg bg-[#0E7C3A] py-2 text-sm font-medium text-white hover:bg-[#0c6a32] disabled:bg-zinc-300"
              >
                {running[g.id] ? 'চলছে ✓' : busy === g.id + 'start' ? 'স্টার্ট...' : 'স্টার্ট'}
              </button>
              <button
                onClick={() => act(g.id, 'stop')}
                disabled={busy === g.id + 'stop' || !running[g.id]}
                className="flex-1 rounded-lg border py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-40"
              >
                স্টপ
              </button>
            </div>
            {running[g.id] && <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
              <span>স্ট্যাটাস: <span className="font-semibold text-[#0E7C3A]">Running</span></span>
              <a href={`/game/${g.id}`} className="rounded-lg bg-[#0F172A] px-3 py-1.5 font-medium text-white">▶ খেলুন</a>
            </div>}
          </div>
        ))}
      </div>

      {servers.length > 0 && (
        <div className="mt-8">
          <h2 className="font-semibold">আমার সার্ভার ({servers.length})</h2>
          <div className="mt-3 space-y-2">
            {servers.map(s => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border bg-white p-3 text-sm">
                <span>{s.inputs?.gameId || s.serviceId} • {new Date(s.createdAt).toLocaleString('bn-BD')}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${s.status === 'running' || s.status === 'processing' ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-600'}`}>{s.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {loading && <p className="mt-6 text-sm text-zinc-500">লোড হচ্ছে...</p>}
    </div>
  )
}
