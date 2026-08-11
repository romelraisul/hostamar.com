'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import AdminLayout from '@/app/admin/layout'

export default function AdminEcosystemClient() {
  const [stats, setStats] = useState({ totalCustomers: 0, totalOrders: 0, totalRevenue: 0, pendingOrders: 0, totalVideos: 0, activeSubscriptions: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStats(d.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-slate-300">
        Loading ecosystem...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-sm text-slate-400">Total Users</div>
          <div className="text-2xl font-semibold text-white">{stats.totalCustomers.toLocaleString()}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-sm text-slate-400">Total Videos</div>
          <div className="text-2xl font-semibold text-emerald-400">{stats.totalVideos.toLocaleString()}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-sm text-slate-400">Revenue (BDT)</div>
          <div className="text-2xl font-semibold text-blue-400">৳{(stats.totalRevenue || 0).toLocaleString()}</div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Product Ecosystem</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['Video', 'Voice', 'Chat', 'Browser', 'IDE', 'Game', 'Hosting', 'Studio'].map((product) => (
            <div key={product} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-center">
              <div className="text-sm font-medium text-white">{product}</div>
              <div className="text-xs text-slate-400 mt-1">Active</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
