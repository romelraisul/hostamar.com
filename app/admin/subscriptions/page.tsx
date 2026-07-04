'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/app/admin/layout'

type Subscription = {
  id: string
  plan: string
  status: string
  price: number
  nextBillingDate?: string
  customer?: {
    name?: string
    email?: string
  }
}

export default function AdminSubscriptionsClient() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch('/api/admin/subscriptions?limit=100', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to load subscriptions')
      const data = await res.json()
      setSubscriptions(data.subscriptions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter(s => s.status === 'active').length,
    inactive: subscriptions.filter(s => s.status !== 'active').length,
    revenue: subscriptions.reduce((sum, s) => sum + (s.price || 0), 0),
  }

  const formatCurrency = (amount: number, currency = 'BDT') => {
    if (currency === 'BDT') return `৳${amount.toLocaleString()}`
    return `${amount} ${currency}`
  }

  const formatDate = (dateString?: string) =>
    dateString
      ? new Date(dateString).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '—'

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-slate-300">
        Loading subscriptions...
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
          <div className="text-sm text-slate-400">Subscriptions</div>
          <div className="text-2xl font-semibold text-white">{stats.total}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-sm text-slate-400">Active</div>
          <div className="text-2xl font-semibold text-emerald-400">{stats.active}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-sm text-slate-400">Inactive</div>
          <div className="text-2xl font-semibold text-amber-400">{stats.inactive}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-sm text-slate-400">Revenue</div>
          <div className="text-2xl font-semibold text-blue-400">{formatCurrency(stats.revenue)}</div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5">
          <h3 className="text-lg font-semibold text-white">Subscriptions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-6 py-3 text-xs text-slate-400 font-medium">Customer</th>
                <th className="text-left px-6 py-3 text-xs text-slate-400 font-medium">Plan</th>
                <th className="text-left px-6 py-3 text-xs text-slate-400 font-medium">Price</th>
                <th className="text-left px-6 py-3 text-xs text-slate-400 font-medium">Next Billing</th>
                <th className="text-left px-6 py-3 text-xs text-slate-400 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="border-b border-white/5 hover:bg-white/5 transition">
                  <td className="px-6 py-4 text-sm text-white">
                    {sub.customer?.name || '—'}
                    <div className="text-xs text-slate-400">{sub.customer?.email || '—'}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-white capitalize">{sub.plan.toLowerCase()}</td>
                  <td className="px-6 py-4 text-sm text-white">{formatCurrency(sub.price)}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">{formatDate(sub.nextBillingDate)}</td>
                  <td className="px-6 py-4">
                    <span
                      className={
                        'text-xs px-2 py-1 rounded-full ' +
                        (sub.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-red-500/20 text-red-300')
                      }
                    >
                      {sub.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!subscriptions.length && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    No subscriptions found.
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
