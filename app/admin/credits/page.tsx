'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import AdminLayout from '@/app/admin/layout'
import { Coins, RefreshCw, Plus, Minus } from 'lucide-react'

type Account = {
  customerId: string
  credits: number
  consumed: number
  customer: { id: string; email: string; name: string; role: string }
}

export default function AdminCreditsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adjust, setAdjust] = useState<{ customerId: string; amount: number; product: string; desc: string }>({ customerId: '', amount: 0, product: 'bonus', desc: '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const products = ['bonus', 'chat_message', 'image_sd', 'image_flux', 'video_wan_5s', 'video_hunyuan_5s', 'browser_search', 'ide_task', 'game_spin', 'hosting_check']

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/credits?limit=200', { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setAccounts(data.accounts || [])
      setStats(data.stats || null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function submitAdjust() {
    if (!adjust.customerId || adjust.amount === 0) return
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customerId: adjust.customerId,
          amount: adjust.amount,
          product: adjust.product,
          description: adjust.desc || `Admin ${adjust.amount > 0 ? 'added' : 'deducted'} ${Math.abs(adjust.amount)} (${adjust.product})`,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setMsg(data.message || 'Updated')
      setAdjust({ customerId: '', amount: 0, product: 'bonus', desc: '' })
      load()
    } catch (e: any) {
      setMsg('Error: ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="min-h-[40vh] flex items-center justify-center text-slate-300">Loading credits…</div>
  if (error) return <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-4">{error}</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Coins className="w-6 h-6 text-yellow-400" /> Credits
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage customer credits & usage across all products</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Customers" value={stats.totalCustomers} />
          <Stat label="Credits Issued" value={stats.totalCreditsIssued} />
          <Stat label="Credits Consumed" value={stats.totalCreditsConsumed} />
          <Stat label="Products" value={stats.productBreakdown?.length || 0} />
        </div>
      )}

      {stats?.productBreakdown?.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Usage by product (net credits)</h2>
          <div className="flex flex-wrap gap-2">
            {stats.productBreakdown.map((p: any) => (
              <span key={p.product} className="px-3 py-1 rounded-full bg-slate-800 text-slate-200 text-xs font-mono">
                {p.product}: <span className={p.netAmount >= 0 ? 'text-green-400' : 'text-red-400'}>{p.netAmount}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Adjust form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Adjust credits</h2>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Customer ID">
            <input value={adjust.customerId} onChange={(e) => setAdjust({ ...adjust, customerId: e.target.value })}
              placeholder="cmslxo7wr..." className="w-56 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white" />
          </Field>
          <Field label="Amount (+/-)">
            <input type="number" value={adjust.amount} onChange={(e) => setAdjust({ ...adjust, amount: parseInt(e.target.value) || 0 })}
              className="w-28 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white" />
          </Field>
          <Field label="Product">
            <select value={adjust.product} onChange={(e) => setAdjust({ ...adjust, product: e.target.value })}
              className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white">
              {products.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Note">
            <input value={adjust.desc} onChange={(e) => setAdjust({ ...adjust, desc: e.target.value })}
              placeholder="optional" className="w-48 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white" />
          </Field>
          <button onClick={submitAdjust} disabled={busy || !adjust.customerId || adjust.amount === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500 text-slate-900 font-semibold disabled:opacity-50 hover:bg-yellow-400">
            {adjust.amount >= 0 ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />} Apply
          </button>
        </div>
        {msg && <p className="text-xs mt-2 text-slate-400">{msg}</p>}
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 text-slate-300">
            <tr>
              <th className="text-left p-3">Customer</th>
              <th className="text-left p-3">Email</th>
              <th className="text-right p-3">Credits</th>
              <th className="text-right p-3">Consumed</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.customerId} className="border-t border-slate-800 hover:bg-slate-800/50">
                <td className="p-3 text-white">{a.customer?.name || '—'}</td>
                <td className="p-3 text-slate-400">{a.customer?.email || '—'}</td>
                <td className="p-3 text-right font-mono text-green-400">{a.credits}</td>
                <td className="p-3 text-right font-mono text-red-400">{a.consumed}</td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr><td colSpan={4} className="p-6 text-center text-slate-500">No credit accounts yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="text-2xl font-bold text-white">{value?.toLocaleString?.() ?? value}</div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-slate-400">{label}</span>
      {children}
    </label>
  )
}
