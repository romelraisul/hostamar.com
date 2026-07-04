'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Globe, GraduationCap, Gamepad2, Shield, Zap, ExternalLink } from 'lucide-react'
import { useLocale } from '@/lib/locale-context'

type EcosystemStatus = {
  local: boolean
  vercel: 'active' | 'degraded' | 'down'
  railway: 'active' | 'degraded' | 'down'
  ollama: 'active' | 'degraded' | 'down'
}

type PlatformModule = {
  id: string
  name: string
  description: string
  href: string
  status: 'active' | 'beta' | 'planned'
  icon: 'hosting' | 'academy' | 'game' | 'browser'
}

type AdminEcosystemResponse = {
  status: EcosystemStatus
  modules: PlatformModule[]
  automation: {
    failover: boolean
    cron: boolean
    bidirectionalSync: boolean
    neonConnected: boolean
  }
}

const moduleIcon = (icon: PlatformModule['icon']) => {
  switch (icon) {
    case 'hosting':
      return <Globe className="w-5 h-5" />
    case 'academy':
      return <GraduationCap className="w-5 h-5" />
    case 'game':
      return <Gamepad2 className="w-5 h-5" />
    case 'browser':
      return <Shield className="w-5 h-5" />
  }
}

export default function AdminEcosystemTab() {
  const { t } = useLocale()
  const [data, setData] = useState<AdminEcosystemResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/admin/ecosystem', { credentials: 'include' })
        if (!res.ok) throw new Error('Failed to load ecosystem status')
        const json = (await res.json()) as AdminEcosystemResponse
        if (!cancelled) {
          setData(json)
          setError(null)
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Unexpected error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-400">
        Loading Fullstake ecosystem status...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center text-red-400">
        {error || 'Ecosystem data unavailable'}
      </div>
    )
  }

  const statusColor = (state: 'active' | 'degraded' | 'down') => {
    if (state === 'active') return 'text-green-400'
    if (state === 'degraded') return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Fullstake Ecosystem</h3>
          <p className="text-sm text-gray-400">
            Unified view across Hostamar, OSSU Academy, LuckyStar, AI Browser, and failover infrastructure.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span>Local-first, zero-cost failover active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatusCard title="Local host" value={data.status.local ? 'Online' : 'Offline'} state={data.status.local ? 'active' : 'down'} />
        <StatusCard title="Vercel fallback" value={data.status.vercel.toUpperCase()} state={data.status.vercel} />
        <StatusCard title="Railway fallback" value={data.status.railway.toUpperCase()} state={data.status.railway} />
        <StatusCard title="Home model / Ollama" value={data.status.ollama.toUpperCase()} state={data.status.ollama} />
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h4 className="text-sm font-semibold text-gray-200 mb-4">Product modules</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.modules.map((moduleItem) => (
            <a
              key={moduleItem.id}
              href={moduleItem.href}
              className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-4 hover:border-white/20 transition"
            >
              <div className="mt-0.5 text-gray-300">{moduleIcon(moduleItem.icon)}</div>
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{moduleItem.name}</p>
                  <ExternalLink className="w-3 h-3 text-gray-400" />
                </div>
                <p className="mt-1 text-xs text-gray-400">{moduleItem.description}</p>
                <p className="mt-2 text-xs text-gray-500 capitalize">{moduleItem.status}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h4 className="text-sm font-semibold text-gray-200 mb-4">Automation & failover</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <AutomationItem label="Failover cron" active={data.automation.failover} />
          <AutomationItem label="Cloud cron active" active={data.automation.cron} />
          <AutomationItem label="Bidirectional sync" active={data.automation.bidirectionalSync} />
          <AutomationItem label="Neon connected" active={data.automation.neonConnected} />
        </div>
      </div>
    </div>
  )
}

function StatusCard({ title, value, state }: { title: string; value: string; state: 'active' | 'degraded' | 'down' }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs text-gray-400">{title}</p>
      <p className={`mt-1 text-lg font-semibold ${statusColorFn(state)}`}>{value}</p>
    </div>
  )
}

function statusColorFn(state: 'active' | 'degraded' | 'down') {
  if (state === 'active') return 'text-green-400'
  if (state === 'degraded') return 'text-yellow-400'
  return 'text-red-400'
}

function AutomationItem({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
      <span className="text-gray-300">{label}</span>
      <span className={`text-xs font-semibold ${active ? 'text-green-400' : 'text-red-400'}`}>
        {active ? 'ON' : 'OFF'}
      </span>
    </div>
  )
}
