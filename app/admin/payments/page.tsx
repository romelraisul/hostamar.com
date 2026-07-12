'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import AdminLayout from '@/app/admin/layout'

type Payment = {
  id: string
  method: string
  amount: number
  currency: string
  status: string
  transactionId?: string
  createdAt: string
}

type PendingTxn = {
  id: string
  customerId: string
  customerEmail: string | null
  customerName: string | null
  amount: number
  currency: string
  status: string
  gateway: string | null
  gatewayTrxId: string | null
  videoPackage: string | null
  creditsAdded: number
  createdAt: string
  approvePath: string
}

export default function AdminPaymentsClient() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [pendingTxns, setPendingTxns] = useState<PendingTxn[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [approveResult, setApproveResult] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchPayments(), fetchPendingTxns()])
      setLoading(false)
    }
    init()
  }, [])

  const fetchPayments = async () => {
    try {
      const res = await fetch('/api/admin/payments?limit=100', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to load payments')
      const data = await res.json()
      setPayments(data.payments || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const fetchPendingTxns = async () => {
    try {
      const res = await fetch('/api/admin/transactions?status=pending_verification&limit=100', {
        credentials: 'include',
      })
      if (!res.ok) return
      const data = await res.json()
      setPendingTxns(data.transactions || [])
    } catch {
      // optional panel — don't block page
    }
  }

  const approveTransaction = async (txn: PendingTxn) => {
    setApprovingId(txn.id)
    setApproveResult(null)
    try {
      const res = await fetch(`/api/admin/payments/approve/${encodeURIComponent(txn.id)}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        setApproveResult({
          ok: true,
          message: `✅ Approved ${txn.gatewayTrxId || txn.id} — ${data.creditsAdded} credits → ${txn.customerEmail}`,
        })
        // Refresh both lists
        await Promise.all([fetchPayments(), fetchPendingTxns()])
      } else if (data.alreadyCompleted) {
        setApproveResult({ ok: true, message: `Already completed ${txn.gatewayTrxId || txn.id}` })
        await fetchPendingTxns()
      } else {
        setApproveResult({ ok: false, message: `❌ ${data.error || res.statusText}` })
      }
    } catch (err: any) {
      setApproveResult({ ok: false, message: `❌ ${err?.message || 'request failed'}` })
    } finally {
      setApprovingId(null)
    }
  }

  const stats = {
    total: payments.length,
    completed: payments.filter(p => p.status === 'completed').length,
    pending: payments.filter(p => p.status !== 'completed').length,
    revenue: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
  }

  const formatCurrency = (amount: number, currency = 'BDT') => {
    if (currency === 'BDT') return `৳${amount.toLocaleString()}`
    return `${amount} ${currency}`
  }

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-slate-300">
        Loading payments...
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-4">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-sm text-slate-400">Total Payments</div>
          <div className="text-2xl font-semibold text-white">{stats.total}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-sm text-slate-400">Completed</div>
          <div className="text-2xl font-semibold text-emerald-400">{stats.completed}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-sm text-slate-400">Pending</div>
          <div className="text-2xl font-semibold text-amber-400">{stats.pending}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-sm text-slate-400">Revenue</div>
          <div className="text-2xl font-semibold text-blue-400">{formatCurrency(stats.revenue)}</div>
        </div>
      </div>

      {pendingTxns.length > 0 && (
        <div className="bg-white/5 border border-amber-500/30 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-amber-300">
                Pending Bkash/Nagad/Rocket ({pendingTxns.length})
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Customers sent money to 01822417463 (bKash) / 01711317101 (Nagad) / 01822417463 (Rocket).
                Click Approve to confirm TrxID, activate subscription, and email receipt.
              </p>
            </div>
          </div>
          {approveResult && (
            <div
              className={
                'px-6 py-3 text-sm border-b border-white/5 ' +
                (approveResult.ok
                  ? 'bg-emerald-500/10 text-emerald-300'
                  : 'bg-red-500/10 text-red-300')
              }
            >
              {approveResult.message}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-6 py-3 text-xs text-slate-400 font-medium">When</th>
                  <th className="text-left px-6 py-3 text-xs text-slate-400 font-medium">Customer</th>
                  <th className="text-left px-6 py-3 text-xs text-slate-400 font-medium">TrxID</th>
                  <th className="text-left px-6 py-3 text-xs text-slate-400 font-medium">Gateway</th>
                  <th className="text-left px-6 py-3 text-xs text-slate-400 font-medium">Plan</th>
                  <th className="text-left px-6 py-3 text-xs text-slate-400 font-medium">Amount</th>
                  <th className="text-right px-6 py-3 text-xs text-slate-400 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingTxns.map((t) => (
                  <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 transition">
                    <td className="px-6 py-4 text-xs text-slate-300">{formatDate(t.createdAt)}</td>
                    <td className="px-6 py-4 text-sm text-white">
                      <div>{t.customerName || '—'}</div>
                      <div className="text-xs text-slate-400">{t.customerEmail}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-white font-mono">{t.gatewayTrxId || '—'}</td>
                    <td className="px-6 py-4 text-sm text-slate-300 capitalize">{(t.gateway || 'bkash_personal').replace('_personal','')}</td>
                    <td className="px-6 py-4 text-sm text-slate-300 uppercase">{(t.videoPackage || 'starter')}</td>
                    <td className="px-6 py-4 text-sm text-white">{formatCurrency(t.amount, t.currency)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => approveTransaction(t)}
                        disabled={approvingId === t.id}
                        className={
                          'px-3 py-1.5 rounded-md text-xs font-medium transition ' +
                          (approvingId === t.id
                            ? 'bg-slate-700 text-slate-400 cursor-wait'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white')
                        }
                      >
                        {approvingId === t.id ? 'Approving…' : 'Approve & Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5">
          <h3 className="text-lg font-semibold text-white">Payments</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-6 py-3 text-xs text-slate-400 font-medium">Transaction</th>
                <th className="text-left px-6 py-3 text-xs text-slate-400 font-medium">Method</th>
                <th className="text-left px-6 py-3 text-xs text-slate-400 font-medium">Amount</th>
                <th className="text-left px-6 py-3 text-xs text-slate-400 font-medium">Status</th>
                <th className="text-left px-6 py-3 text-xs text-slate-400 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b border-white/5 hover:bg-white/5 transition">
                  <td className="px-6 py-4 text-sm text-white">
                    {payment.transactionId || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-white capitalize">
                    {payment.method.toLowerCase()}
                  </td>
                  <td className="px-6 py-4 text-sm text-white">
                    {formatCurrency(payment.amount, payment.currency)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={
                        'text-xs px-2 py-1 rounded-full ' +
                        (payment.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : payment.status === 'processing'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-red-500/20 text-red-300')
                      }
                    >
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">{formatDate(payment.createdAt)}</td>
                </tr>
              ))}
              {!payments.length && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    No payments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
