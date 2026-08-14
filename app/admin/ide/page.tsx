'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import AdminLayout from '@/app/admin/layout'
import { Terminal, RefreshCw, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'

export default function AdminIdePage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/ide/status', { credentials: 'include' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed')
      setData(d)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Terminal className="w-6 h-6 text-green-400" /> IDE — Maintain
          </h1>
          <p className="text-slate-400 text-sm mt-1">IDE product + Hostamar model-gateway (hostamar.com/v1) health</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {loading && <div className="text-slate-300">Checking…</div>}
      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-4">{error}</div>}

      {data && (
        <>
          <div className={`rounded-xl p-4 border ${data.overall === 'healthy' ? 'bg-green-500/10 border-green-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
            <div className="flex items-center gap-2 font-semibold">
              {data.overall === 'healthy' ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <AlertTriangle className="w-5 h-5 text-yellow-400" />}
              <span className={data.overall === 'healthy' ? 'text-green-300' : 'text-yellow-300'}>Overall: {data.overall}</span>
              <span className="ml-auto text-xs text-slate-400">{new Date(data.checkedAt).toLocaleTimeString()}</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {Object.entries(data.checks).map(([name, c]: any) => (
              <div key={name} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  {c.ok ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <XCircle className="w-5 h-5 text-red-400" />}
                  <span className="font-mono text-sm text-white">{name}</span>
                </div>
                <div className="text-xs text-slate-400 mt-2">
                  {c.ok ? `status ${c.status} · ${c.ms}ms` : (c.error || 'down')}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-slate-400">
            <p className="text-slate-300 font-semibold mb-1">Model API for customers</p>
            <p>Customers use <span className="font-mono text-green-400">https://hostamar.com/v1</span> with their own API key (from /api/keys).</p>
            <p className="mt-1">Base URL: <span className="font-mono">https://hostamar.com/v1</span> · Models: <span className="font-mono">rafan</span>, <span className="font-mono">rushan</span>, <span className="font-mono">borna</span>, <span className="font-mono">hostamar</span>, <span className="font-mono">image</span>, <span className="font-mono">video</span></p>
          </div>
        </>
      )}
    </div>
  )
}
