'use client'

import { useEffect, useState } from 'react'

interface Model {
  id: string
  object?: string
  owned_by?: string
  description?: string
  context_window?: number
}

interface GatewayModels {
  source?: 'live' | 'static'
  data: Model[]
  gatewayUrl?: string
  hasKey?: boolean
}

export default function ModelsTab() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [models, setModels] = useState<Model[]>([])
  const [source, setSource] = useState<'live' | 'static'>('static')
  const [gatewayUrl, setGatewayUrl] = useState('')
  const [hasKey, setHasKey] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/gateway/models')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data: GatewayModels = await res.json()
        setModels(data.data || [])
        setSource(data.source || 'static')
        setGatewayUrl(data.gatewayUrl || '')
        setHasKey(!!data.hasKey)
      } catch (e: any) {
        setError(e?.message || 'Failed to load models')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-700 font-medium">Could not load models</p>
        <p className="text-xs text-red-500 mt-1">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">আপনার AI মডেলসমূহ</h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            source === 'live' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {source === 'live' ? '● লাইভ' : '● অফলাইন (তালিকা ক্যাশড)'}
        </span>
      </div>

      {!hasKey && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-700">
          আপনার এখনো কোনো API key নেই — নিচের `API Keys` ট্যাব থেকে একটি তৈরি করুন যাতে লাইভ মডেল তালিকা দেখতে পারেন।
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {models.map((m) => (
          <div key={m.id} className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-gray-900">{m.id}</p>
                <p className="text-xs text-gray-500 mt-0.5">{m.owned_by || 'hostamar'}</p>
              </div>
              <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 uppercase">
                {m.object?.replace('model', 'AI') || 'model'}
              </span>
            </div>
            {m.description && <p className="mt-2 text-xs text-gray-600 leading-relaxed">{m.description}</p>}
            {typeof m.context_window === 'number' && (
              <p className="mt-2 text-[11px] text-gray-400">Context: {m.context_window.toLocaleString()} tokens</p>
            )}
          </div>
        ))}
      </div>

      {gatewayUrl && (
        <p className="text-[11px] text-gray-400">
          Gateway: <code className="font-mono">{gatewayUrl}</code>
        </p>
      )}
    </div>
  )
}
