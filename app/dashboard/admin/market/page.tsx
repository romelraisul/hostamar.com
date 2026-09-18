'use client'

import { useEffect, useState } from 'react'
import { Check, X, RefreshCw } from 'lucide-react'

type Trend = {
  id: string
  service: string
  oldPrice: number | null
  newPrice: number
  driftPct: number
  source: string
  status: 'pending_approval' | 'applied' | 'rejected'
  createdAt: string
}

export default function AdminMarket() {
  const [trends, setTrends] = useState<Trend[]>([])
  const [syncing, setSyncing] = useState(false)
  const [msg, setMsg] = useState('')

  const load = () => fetch('/api/admin/market-trends').then(r => r.json()).then(d => setTrends(d.trends || []))
  useEffect(() => { load() }, [])

  const syncNow = async () => {
    setSyncing(true); setMsg('')
    const r = await fetch('/api/cron/market-sync').then(r => r.json()).catch(() => ({}))
    setMsg(r.ok ? `Synced. ${r.trends?.length || 0} drift queued.` : 'Sync failed')
    setSyncing(false); load()
  }

  const decide = async (id: string, action: 'approve' | 'reject') => {
    await fetch('/api/admin/market-decide', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    }).catch(() => ({}))
    load()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Market Sync</h1>
        <button onClick={syncNow} disabled={syncing}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0E7C3A] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
          Sync now
        </button>
      </div>
      {msg && <p className="rounded bg-slate-100 px-3 py-2 text-xs">{msg}</p>}
      <p className="text-xs text-slate-500">
        Plans: Starter 599 · Basic 1199 · Pro 2499 · Premium 4999 Taka.
        AUTO_ADJUST = off. Drift &gt;10% is queued for your approval.
      </p>
      {trends.length === 0 && <p className="text-sm text-slate-500">No drift pending. Prices are at market.</p>}
      {trends.map(t => (
        <div key={t.id} className="rounded-xl border bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold capitalize">{t.service.replace('.', ' ')}</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              t.status === 'pending_approval' ? 'bg-amber-100 text-amber-800' :
              t.status === 'applied' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>{t.status}</span>
          </div>
          <p className="mt-1 text-sm">
            {t.oldPrice} → <span className="font-bold">{t.newPrice}</span> Taka
            <span className={`ml-2 text-xs ${t.driftPct < 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              ({t.driftPct > 0 ? '+' : ''}{t.driftPct}%)
            </span>
          </p>
          <p className="text-xs text-slate-500">via {t.source}</p>
          {t.status === 'pending_approval' && (
            <div className="mt-3 flex gap-2">
              <button onClick={() => decide(t.id, 'approve')}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white">
                <Check className="h-3 w-3" /> Apply
              </button>
              <button onClick={() => decide(t.id, 'reject')}
                className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white">
                <X className="h-3 w-3" /> Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
