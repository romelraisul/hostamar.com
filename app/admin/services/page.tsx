'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import AdminLayout from '@/app/admin/layout'

type Service = {
  id: string
  name: string
  description?: string
  price?: number
  status: string
  customer?: {
    name?: string
    email?: string
  }
}

export default function AdminServicesClient() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/admin/services?limit=100', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to load services')
      const data = await res.json()
      setServices(data.services || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const stats = {
    total: services.length,
    active: services.filter(s => s.status === 'active').length,
    inactive: services.filter(s => s.status !== 'active').length,
  }

  const formatCurrency = (amount: number, currency = 'BDT') => {
    if (currency === 'BDT') return `৳${amount.toLocaleString()}`
    return `${amount} ${currency}`
  }

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-slate-300">
        Loading services...
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-sm text-slate-400">Services</div>
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
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5">
          <h3 className="text-lg font-semibold text-white">Services</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-6 py-3 text-xs text-slate-400 font-medium">Customer</th>
                <th className="text-left px-6 py-3 text-xs text-slate-400 font-medium">Service</th>
                <th className="text-left px-6 py-3 text-xs text-slate-400 font-medium">Price</th>
                <th className="text-left px-6 py-3 text-xs text-slate-400 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id} className="border-b border-white/5 hover:bg-white/5 transition">
                  <td className="px-6 py-4 text-sm text-white">
                    {service.customer?.name || '—'}
                    <div className="text-xs text-slate-400">{service.customer?.email || '—'}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-white capitalize">
                    <div>{service.name || 'Unnamed service'}</div>
                    {service.description && (
                      <div className="text-xs text-slate-400">{service.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-white">
                    {service.price !== undefined ? formatCurrency(service.price) : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={
                        'text-xs px-2 py-1 rounded-full ' +
                        (service.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-red-500/20 text-red-300')
                      }
                    >
                      {service.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!services.length && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                    No services found.
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
