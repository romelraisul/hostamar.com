'use client'

// app/status/page.tsx — PUBLIC status page (no auth, cached 30s server-side).
// Reads /api/status for per-product green/yellow/red state.
import { useEffect, useState } from 'react'

type State = 'green' | 'yellow' | 'red'
interface StatusResp {
  products: Record<string, State>
  generatedAt: string
}

const DOT: Record<State, string> = {
  green: '🟢',
  yellow: '🟡',
  red: '🔴',
}
const LABEL: Record<State, string> = {
  green: 'Operational',
  yellow: 'Degraded',
  red: 'Outage',
}

export default function StatusPage() {
  const [data, setData] = useState<StatusResp | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const res = await fetch('/api/status', { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as StatusResp
        if (alive) setData(json)
      } catch (e) {
        if (alive) setErr(String((e as Error).message || e))
      }
    }
    load()
    const t = setInterval(load, 30_000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Hostamar Status</h1>
        <p className="text-slate-500 mb-6">
          {data ? `Last updated ${new Date(data.generatedAt).toLocaleString()}` : err ? `Error: ${err}` : 'Loading…'}
        </p>
        <div className="grid grid-cols-1 gap-3">
          {data &&
            Object.entries(data.products).map(([name, state]) => (
              <div key={name} className="flex items-center justify-between border rounded-lg bg-white px-4 py-3 shadow-sm">
                <span className="font-medium capitalize">{name === 'SSO' ? 'SSO' : name}</span>
                <span className="flex items-center gap-2">
                  <span>{DOT[state]}</span>
                  <span className="text-sm text-slate-600">{LABEL[state]}</span>
                </span>
              </div>
            ))}
        </div>
        <p className="mt-8 text-xs text-slate-400">
          Automated Tier-1 checks run every 5 minutes. Incidents are posted to the operations channel.
        </p>
      </div>
    </div>
  )
}
