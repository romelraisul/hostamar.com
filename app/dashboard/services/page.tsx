'use client'

import { useEffect, useState } from 'react'
import { Plus, Server, Cloud, Terminal, HardDrive, Power, MoreVertical, Trash2, RefreshCw } from 'lucide-react'
import { useLocale } from '@/lib/locale-context'

interface Service {
  id: string
  type: string
  name: string
  status: string
  specs: string
  price: number
  serverIp: string | null
  createdAt: string
  expiresAt: string | null
}

const serviceIcons: Record<string, any> = {
  vps: Server,
  rdp: Terminal,
  'web-hosting': Cloud,
  storage: HardDrive,
}

export default function ServicesPage() {
  const { t } = useLocale()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const serviceLabels: Record<string, string> = {
    vps: t('dashServices.vps'),
    rdp: t('dashServices.rdp'),
    'web-hosting': t('dashServices.webHosting'),
    storage: t('dashServices.storage'),
  }

  useEffect(() => {
    fetchServices()
  }, [])

  async function fetchServices() {
    try {
      const res = await fetch('/api/dashboard/services')
      if (res.ok) {
        const data = await res.json()
        setServices(data.services)
      }
    } catch (error) {
      console.error('Failed to fetch services:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 border-green-200'
      case 'suspended': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'terminated': return 'bg-red-100 text-red-700 border-red-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const parseSpecs = (specs: string) => {
    try {
      return JSON.parse(specs)
    } catch {
      return {}
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{t('dashServices.title')}</h1>
          <p className="text-gray-500 mt-1">{t('dashServices.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('dashServices.order')}
        </button>
      </div>
      {services.length > 0 ? (
        <div className="space-y-4">
          {services.map((service) => {
            const Icon = serviceIcons[service.type] || Server
            const specs = parseSpecs(service.specs)
            
            return (
              <div key={service.id} className="bg-white rounded-xl border p-6 hover:shadow-sm transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Icon & Basic Info */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{service.name}</h3>
                      <p className="text-sm text-gray-500">{serviceLabels[service.type] || service.type}</p>
                    </div>
                  </div>

                  {/* Specs */}
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {specs.cpu && (
                      <div>
                        <p className="text-gray-400">CPU</p>
                        <p className="font-medium">{specs.cpu} vCPU</p>
                      </div>
                    )}
                    {specs.ram && (
                      <div>
                        <p className="text-gray-400">RAM</p>
                        <p className="font-medium">{specs.ram} GB</p>
                      </div>
                    )}
                    {specs.storage && (
                      <div>
                        <p className="text-gray-400">Storage</p>
                        <p className="font-medium">{specs.storage} GB</p>
                      </div>
                    )}
                    {specs.bandwidth && (
                      <div>
                        <p className="text-gray-400">Bandwidth</p>
                        <p className="font-medium">{specs.bandwidth}</p>
                      </div>
                    )}
                  </div>

                  {/* Status & Actions */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(service.status)}`}>
                        {service.status}
                      </span>
                      {service.serverIp && (
                        <p className="text-xs text-gray-400 mt-1">{service.serverIp}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {service.status === 'active' && (
                        <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg">
                          <Power className="w-4 h-4" />
                        </button>
                      )}
                      <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Price & Expiry */}
                <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
                  <div className="text-gray-500">
                    Created: {new Date(service.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-4">
                    {service.expiresAt && (
                      <span className="text-gray-500">
                        Expires: {new Date(service.expiresAt).toLocaleDateString()}
                      </span>
                    )}
                    <span className="font-semibold text-gray-900">৳{service.price}/month</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border p-12 text-center">
          <Server className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('dashServices.noServices')}</h3>
          <p className="text-gray-500 mb-4">{t('dashServices.orderFirst')}</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            {t('dashServices.order')}
          </button>
        </div>
      )}

      {/* Create Service Modal */}
      {showCreateModal && (
        <CreateServiceModal onClose={() => setShowCreateModal(false)} onCreated={fetchServices} />
      )}
    </div>
  )
}

function CreateServiceModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { t } = useLocale()
  const [formData, setFormData] = useState({
    type: 'vps',
    name: '',
    cpu: '2',
    ram: '4',
    storage: '40',
    billingCycle: 'monthly',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const prices: Record<string, number> = {
    vps: 1500,
    rdp: 2500,
    'web-hosting': 500,
    storage: 300,
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const specs = JSON.stringify({
        cpu: parseInt(formData.cpu),
        ram: parseInt(formData.ram),
        storage: parseInt(formData.storage),
        bandwidth: 'Unlimited',
      })

      const res = await fetch('/api/dashboard/services/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formData.type,
          name: formData.name,
          specs,
          price: prices[formData.type],
          billingCycle: formData.billingCycle,
        }),
      })

      if (res.ok) {
        onCreated()
        onClose()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to create service')
      }
    } catch (err) {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{t('dashServices.orderNewTitle')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('dashServices.serviceType')}</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="vps">{t('dashServices.vps')}</option>
              <option value="rdp">{t('dashServices.rdp')}</option>
              <option value="web-hosting">{t('dashServices.webHosting')}</option>
              <option value="storage">{t('dashServices.storage')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('dashServices.serviceName')}</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder={t('dashServices.serviceNamePlaceholder')}
            />
          </div>

          {(formData.type === 'vps' || formData.type === 'rdp') && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">vCPU</label>
                  <select
                    value={formData.cpu}
                    onChange={(e) => setFormData({ ...formData, cpu: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="1">1 vCPU</option>
                    <option value="2">2 vCPU</option>
                    <option value="4">4 vCPU</option>
                    <option value="8">8 vCPU</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RAM</label>
                  <select
                    value={formData.ram}
                    onChange={(e) => setFormData({ ...formData, ram: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="2">2 GB</option>
                    <option value="4">4 GB</option>
                    <option value="8">8 GB</option>
                    <option value="16">16 GB</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Storage</label>
                  <select
                    value={formData.storage}
                    onChange={(e) => setFormData({ ...formData, storage: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="20">20 GB</option>
                    <option value="40">40 GB</option>
                    <option value="80">80 GB</option>
                    <option value="100">100 GB</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Price:</strong> ৳{prices[formData.type]}/month
            </p>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              {t('dashServices.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? t('dashServices.creating') : t('dashServices.orderNow')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}