'use client'

/**
 * /dashboard/admin/payments — V17 admin panel for pending bKash/Nagad/Rocket
 * personal payments. Lists pending_verification transactions (scope=all),
 * with one-click Approve (POST /api/admin/payments/approve/[transactionId])
 * which flips pending → completed, activates the subscription, and grants
 * the plan credits from lib/pricing.ts.
 */
import { useEffect, useState } from 'react'
import { Loader2, ShieldCheck, RefreshCw, CheckCircle2, Clock } from 'lucide-react'

const GREEN = '#0E7C3A'

type Txn = {
  id: string
  amount: number
  currency: string
  status: string
  gateway: string | null
  gatewayTrxId: string | null
  videoPackage: string | null
  creditsAdded: number
  createdAt: string
  customer: { id: string; name: string | null; email: string; phone: string | null }
}

export default function AdminPaymentsPage() {
  const [txns, setTxns] = useState<Txn[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [approving, setApproving] = useState<string | null>(null)
  const [result, setResult] = useState<string>('')

  async function load() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/payment/bkash/verify', { credentials: 'include' })
      const data = await res.json().catch(() => null)
      if (res.ok && data?.transactions) {
        setTxns(data.transactions)
      } else {
        setError(data?.error || 'লোড ব্যর্থ — অ্যাডমিন লগইন আছে কি না চেক করুন')
      }
    } catch {
      setError('লোড ব্যর্থ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function approve(t: Txn) {
    setApproving(t.id); setResult('')
    try {
      const res = await fetch(`/api/admin/payments/approve/${encodeURIComponent(t.gatewayTrxId || t.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notes: 'approved from admin payments panel V17' }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok && (data?.success || data?.alreadyCompleted)) {
        setResult(`✓ ${t.customer?.email || ''} — ${data.alreadyCompleted ? 'already completed' : `+${t.creditsAdded}cr granted`}`)
        load()
      } else {
        setError(data?.error || 'অনুমোদন ব্যর্থ')
      }
    } catch {
      setError('অনুমোদন ব্যর্থ')
    } finally {
      setApproving(null)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6" style={{ color: GREEN }} />
          <h1 className="text-xl font-bold">Admin — Pending Payments</h1>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
            bKash 01822417463
          </span>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1.5 text-[13px] font-medium hover:border-zinc-400">
          <RefreshCw className="h-3.5 w-3.5" /> Reload
        </button>
      </div>

      {result && <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-[13px] font-semibold text-emerald-700">{result}</p>}
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-600">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> লোড হচ্ছে…</div>
      ) : txns.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-[14px] text-zinc-500">
          <Clock className="h-4 w-4" /> কোনো pending পেমেন্ট নেই — সব পরিষ্কার ✓
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-zinc-50 text-[11px] uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Credits</th>
                <th className="px-3 py-2">TrxID</th>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {txns.map((t) => (
                <tr key={t.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2">
                    <div className="font-medium">{t.customer?.name || t.customer?.email}</div>
                    <div className="text-[11px] text-zinc-400">{t.customer?.phone || t.customer?.email}</div>
                  </td>
                  <td className="px-3 py-2">{t.videoPackage}</td>
                  <td className="px-3 py-2 font-semibold">৳{t.amount}</td>
                  <td className="px-3 py-2 font-semibold" style={{ color: GREEN }}>+{t.creditsAdded}cr</td>
                  <td className="px-3 py-2 font-mono text-[11px]">{t.gatewayTrxId}</td>
                  <td className="px-3 py-2 text-[11px] text-zinc-400">{new Date(t.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => approve(t)}
                      disabled={approving === t.id}
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-60"
                      style={{ background: GREEN }}
                    >
                      {approving === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      Approve
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-[11px] text-zinc-400">
        Approve → transaction completed · subscription activated · credits granted (from lib/pricing.ts single source) · customer notified.
      </p>
    </div>
  )
}
