'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'

type Order = {
  id: string
  plan: string
  amount: number
  status: string
  currency: string
  createdAt: string
  customer?: {
    name?: string
    email?: string
  }
}

export default function AdminOrdersClient() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/admin/orders?limit=100', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to load orders')
      const data = await res.json()
      setOrders(data.orders || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const stats = {
    total: orders.length,
    completed: orders.filter(o => o.status === 'completed').length,
    pending: orders.filter(o => o.status !== 'completed').length,
    revenue: orders.reduce((sum, o) => sum + (o.amount || 0), 0),
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
      <div className="min-h-[40vh] flex items-center justify-center text-[#57534E]">
        Loading orders...
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
          <div className="text-sm text-[#78716C]">Total Orders</div>
          <div className="text-2xl font-semibold text-[#1C1917]">{stats.total}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-sm text-[#78716C]">Completed</div>
          <div className="text-2xl font-semibold text-emerald-400">{stats.completed}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-sm text-[#78716C]">Pending</div>
          <div className="text-2xl font-semibold text-amber-400">{stats.pending}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-sm text-[#78716C]">Revenue</div>
          <div className="text-2xl font-semibold text-[#0E7C3A]">{formatCurrency(stats.revenue)}</div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5">
          <h3 className="text-lg font-semibold text-[#1C1917]">Orders</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-6 py-3 text-xs text-[#78716C] font-medium">Customer</th>
                <th className="text-left px-6 py-3 text-xs text-[#78716C] font-medium">Plan</th>
                <th className="text-left px-6 py-3 text-xs text-[#78716C] font-medium">Amount</th>
                <th className="text-left px-6 py-3 text-xs text-[#78716C] font-medium">Status</th>
                <th className="text-left px-6 py-3 text-xs text-[#78716C] font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-white/5 hover:bg-white/5 transition">
                  <td className="px-6 py-4 text-sm text-[#1C1917]">
                    {order.customer?.name || '—'}
                    <div className="text-xs text-[#78716C]">{order.customer?.email || '—'}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-[#1C1917] capitalize">
                    {order.plan.toLowerCase()}
                  </td>
                  <td className="px-6 py-4 text-sm text-[#1C1917]">
                    {formatCurrency(order.amount, order.currency)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={
                        'text-xs px-2 py-1 rounded-full ' +
                        (order.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : order.status === 'processing'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-red-500/20 text-red-300')
                      }
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[#57534E]">{formatDate(order.createdAt)}</td>
                </tr>
              ))}
              {!orders.length && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-[#78716C]">
                    No orders found.
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
