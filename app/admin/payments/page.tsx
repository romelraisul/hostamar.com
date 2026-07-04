'use client'

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

export default function AdminPaymentsClient() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    try {
      const res = await fetch('/api/admin/payments?limit=100', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to load payments')
      const data = await res.json()
      setPayments(data.payments || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
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
