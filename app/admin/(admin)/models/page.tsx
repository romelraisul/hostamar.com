'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Bot, Cpu, AlertTriangle, Zap, Play, Square, 
  RefreshCw, Clock, BarChart3, Shield, Loader2, 
  ChevronDown, ChevronUp, Info
} from 'lucide-react'

interface ModelInfo {
  id: string
  name: string
  size: string
  parameters: string
  quantization: string
  type: 'chat' | 'image'
  runner: 'dmr' | 'ollama'
  status: 'idle' | 'loading' | 'loaded' | 'error'
  vramUsage?: string
  lastError?: string
  asyncOnly: boolean
  circuitBreaker: 'closed' | 'open' | 'half-open'
  failureCount: number
  avgLatency?: number
}

interface AuditEntry {
  timestamp: string
  action: string
  model: string
  admin: string
  ip: string
}

const MODELS_CONFIG: ModelInfo[] = [
  {
    id: 'smollm3:F16',
    name: 'Smollm3 F16',
    size: '5.73 GB',
    parameters: '3.08 B',
    quantization: 'F16',
    type: 'chat',
    runner: 'dmr',
    status: 'loaded',
    vramUsage: '~2.1 GB',
    asyncOnly: false,
    circuitBreaker: 'closed',
    failureCount: 0,
    avgLatency: 3200,
  },
  {
    id: 'qwen3.6:27B',
    name: 'Qwen 3.6 27B',
    size: '16.39 GB',
    parameters: '26.90 B',
    quantization: 'Q4_K_M',
    type: 'chat',
    runner: 'dmr',
    status: 'loaded',
    vramUsage: '~6.8 GB',
    asyncOnly: true,
    circuitBreaker: 'half-open',
    failureCount: 3,
    lastError: 'GPU OOM — falling back to CPU',
    avgLatency: 45000,
  },
  {
    id: 'seed-oss:36B-UD-IQ1_M',
    name: 'Seed OSS 36B',
    size: '8.45 GB',
    parameters: '36.15 B',
    quantization: 'IQ4_NL',
    type: 'chat',
    runner: 'dmr',
    status: 'error',
    vramUsage: 'N/A (OOM)',
    asyncOnly: true,
    circuitBreaker: 'open',
    failureCount: 7,
    lastError: 'Out of memory on RTX 5060 8GB',
    avgLatency: undefined,
  },
  {
    id: 'hermes3',
    name: 'Hermes 3 (Ollama)',
    size: '4.7 GB',
    parameters: '~7 B',
    quantization: 'Q4_K_M',
    type: 'chat',
    runner: 'ollama',
    status: 'loaded',
    vramUsage: '~3.2 GB',
    asyncOnly: false,
    circuitBreaker: 'closed',
    failureCount: 0,
    avgLatency: 2800,
  },
  {
    id: 'stable-diffusion:latest',
    name: 'Stable Diffusion XL',
    size: '6.94 GB',
    parameters: '~2.6 B',
    quantization: 'fp16',
    type: 'image',
    runner: 'dmr',
    status: 'error',
    vramUsage: 'N/A (diffusers backend)',
    asyncOnly: true,
    circuitBreaker: 'open',
    failureCount: 4,
    lastError: 'Diffusers backend not available on Windows Docker Desktop',
    avgLatency: undefined,
  },
]

const VRAM_TOTAL = 8 // GB

export default function AdminModelsPage() {
  const [models, setModels] = useState<ModelInfo[]>(MODELS_CONFIG)
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<string | null>(null)
  const [showAuditLog, setShowAuditLog] = useState(false)
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])

  useEffect(() => {
    const fetchLiveStatus = () => {
      fetch('/api/admin/models')
        .then(r => r.json())
        .then(data => {
          if (data.models) {
            setModels(prev => prev.map(m => {
              const live = data.models.find((lm: any) => lm.id === m.id)
              if (live) {
                return {
                  ...m,
                  circuitBreaker: live.circuitBreaker === 'open' ? 'open' : 
                                   live.circuitBreaker === 'half-open' ? 'half-open' : 'closed',
                  failureCount: live.failures || m.failureCount,
                }
              }
              return m
            }))
          }
        })
        .catch(() => {})
    }
    fetchLiveStatus()
    const interval = setInterval(fetchLiveStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const toggleAsyncOnly = (modelId: string) => {
    setModels(prev => prev.map(m => {
      if (m.id === modelId) {
        const newVal = !m.asyncOnly
        logAudit(newVal ? 'enabled_async_only' : 'disabled_async_only', modelId)
        return { ...m, asyncOnly: newVal }
      }
      return m
    }))
    setConfirmAction(null)
  }

  const resetCircuitBreaker = (modelId: string) => {
    setModels(prev => prev.map(m => {
      if (m.id === modelId) {
        logAudit('reset_circuit_breaker', modelId)
        return { ...m, circuitBreaker: 'closed', failureCount: 0 }
      }
      return m
    }))
    setConfirmAction(null)
  }

  const loadModel = (modelId: string) => {
    setModels(prev => prev.map(m => {
      if (m.id === modelId) {
        logAudit('load_model', modelId)
        return { ...m, status: 'loading' }
      }
      return m
    }))
    setTimeout(() => {
      setModels(prev => prev.map(m => {
        if (m.id === modelId) {
          return { ...m, status: 'loaded' }
        }
        return m
      }))
    }, 3000)
    setConfirmAction(null)
  }

  const unloadModel = (modelId: string) => {
    setModels(prev => prev.map(m => {
      if (m.id === modelId) {
        logAudit('unload_model', modelId)
        return { ...m, status: 'idle' }
      }
      return m
    }))
    setConfirmAction(null)
  }

  const logAudit = (action: string, model: string) => {
    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      action,
      model,
      admin: 'admin@hostamar.com',
      ip: '127.0.0.1',
    }
    setAuditLog(prev => [entry, ...prev].slice(0, 100))
    fetch('/api/admin/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, modelId: model, details: { source: 'models-page' } }),
    }).catch(() => {})
  }

  const usedVRAM = models
    .filter(m => m.status === 'loaded' && m.vramUsage)
    .reduce((acc, m) => {
      const match = m.vramUsage?.match(/([\d.]+)/)
      return acc + (match ? parseFloat(match[1]) : 0)
    }, 0)

  const vramPercent = (usedVRAM / VRAM_TOTAL) * 100
  const vramColor = vramPercent > 80 ? 'bg-red-500' : vramPercent > 50 ? 'bg-amber-500' : 'bg-green-500'

  const totalFailures = models.reduce((acc, m) => acc + m.failureCount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Models</h1>
          <p className="text-gray-500">Manage model inventory, safety controls, and async job queue</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAuditLog(!showAuditLog)}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Shield className="w-4 h-4" />
            Audit Log ({auditLog.length})
          </button>
        </div>
      </div>

      {/* VRAM Dashboard */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-600" />
            GPU VRAM — RTX 5060 (8GB)
          </h2>
          <span className="text-sm font-medium text-gray-600">
            {usedVRAM.toFixed(1)} GB / {VRAM_TOTAL} GB
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className={`h-4 rounded-full transition-all duration-500 ${vramColor}`}
            style={{ width: `${Math.min(vramPercent, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>Safe (&lt;50%)</span>
          <span>Warning (50-80%)</span>
          <span>Critical (&gt;80%)</span>
        </div>
        {vramPercent > 50 && (
          <div className="mt-3 flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-700">
              {vramPercent > 80
                ? 'VRAM critically high. Unload unused models to avoid OOM errors.'
                : 'Moderate VRAM usage. Large models may trigger OOM.'}
            </p>
          </div>
        )}
      </div>

      {/* Models Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {models.map(model => {
          const vramMatch = model.vramUsage?.match(/([\d.]+)/)
          const vramVal = vramMatch ? parseFloat(vramMatch[1]) : 0
          const wouldOom = vramVal > (VRAM_TOTAL - usedVRAM + (model.status === 'loaded' ? vramVal : 0))

          return (
            <div
              key={model.id}
              className={`bg-white rounded-xl border-2 p-5 transition-all ${
                selectedModel === model.id ? 'border-blue-400 shadow-md' : 'border-gray-200'
              } ${model.circuitBreaker === 'open' ? 'opacity-75' : ''}`}
              onClick={() => setSelectedModel(model.id)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    model.type === 'image' ? 'bg-purple-100' : 'bg-blue-100'
                  }`}>
                    <Bot className={`w-5 h-5 ${model.type === 'image' ? 'text-purple-600' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{model.name}</h3>
                    <p className="text-xs text-gray-500">
                      {model.parameters} · {model.quantization}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    model.status === 'loaded' ? 'bg-green-100 text-green-700' :
                    model.status === 'loading' ? 'bg-blue-100 text-blue-700' :
                    model.status === 'error' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {model.status === 'loading' ? (
                      <span className="flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Loading
                      </span>
                    ) : model.status}
                  </span>
                  {model.asyncOnly && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Async
                    </span>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Size</p>
                  <p className="text-sm font-semibold text-gray-900">{model.size}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">VRAM</p>
                  <p className={`text-sm font-semibold ${wouldOom ? 'text-red-600' : 'text-gray-900'}`}>
                    {model.vramUsage || 'N/A'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Latency</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {model.avgLatency ? `${(model.avgLatency / 1000).toFixed(1)}s` : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Circuit Breaker Status */}
              <div className="flex items-center gap-2 mb-3">
                <Shield className={`w-4 h-4 ${
                  model.circuitBreaker === 'closed' ? 'text-green-500' :
                  model.circuitBreaker === 'half-open' ? 'text-amber-500' :
                  'text-red-500'
                }`} />
                <span className="text-xs text-gray-600">
                  Circuit breaker: {model.circuitBreaker === 'closed' ? 'Closed (normal)' :
                    model.circuitBreaker === 'half-open' ? 'Half-open (testing)' :
                    'Open (blocked)'}
                </span>
                {model.failureCount > 0 && (
                  <span className="text-xs text-red-500 ml-auto">
                    {model.failureCount} failures
                  </span>
                )}
              </div>

              {/* Error display */}
              {model.lastError && (
                <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-600">{model.lastError}</p>
                </div>
              )}

              {/* OOM Warning */}
              {wouldOom && model.status !== 'loaded' && (
                <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    Loading this model may exceed available VRAM ({VRAM_TOTAL - usedVRAM} GB free)
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 mt-2">
                {model.status === 'loaded' || model.status === 'error' ? (
                  <>
                    {model.status === 'loaded' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmAction(`unload:${model.id}`) }}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        <Square className="w-3 h-3" />
                        Unload
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmAction(`async:${model.id}`) }}
                      className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm border rounded-lg ${
                        model.asyncOnly
                          ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      {model.asyncOnly ? 'Async (sync disabled)' : 'Async off (sync ok)'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmAction(`load:${model.id}`) }}
                    disabled={wouldOom}
                    className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm rounded-lg ${
                      wouldOom
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    <Play className="w-3 h-3" />
                    Load Model
                  </button>
                )}
                {model.circuitBreaker !== 'closed' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmAction(`reset:${model.id}`) }}
                    className="px-3 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Confirmation Modal */}
              {confirmAction?.endsWith(model.id) && (
                <div className="mt-3 p-3 border border-amber-200 bg-amber-50 rounded-lg">
                  <p className="text-sm text-amber-800 mb-2 font-medium">
                    {confirmAction.startsWith('load') && 'Are you sure you want to load this model?'}
                    {confirmAction.startsWith('unload') && 'This will unload the model. Active requests will fail.'}
                    {confirmAction.startsWith('async') && 'Toggle async-only mode?'}
                    {confirmAction.startsWith('reset') && 'Reset circuit breaker? This will allow requests again.'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation();
                        if (confirmAction.startsWith('unload')) unloadModel(model.id)
                        else if (confirmAction.startsWith('async')) toggleAsyncOnly(model.id)
                        else if (confirmAction.startsWith('reset')) resetCircuitBreaker(model.id)
                        else if (confirmAction.startsWith('load')) loadModel(model.id)
                      }}
                      className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmAction(null) }}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Total Failures Alert */}
      {totalFailures > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">
              {totalFailures} total model failures detected
            </p>
            <p className="text-xs text-red-600">
              Circuit breakers opened: {models.filter(m => m.circuitBreaker !== 'closed').length}.
              Reset individual breakers above or check system health.
            </p>
          </div>
        </div>
      )}

      {/* Audit Log Panel */}
      {showAuditLog && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-gray-600" />
            Audit Log — Admin Model Actions
          </h2>
          {auditLog.length === 0 ? (
            <p className="text-gray-500 text-sm">No actions recorded yet. Changes to model settings are logged here.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="pb-2 text-sm font-medium text-gray-600 pr-4">Time</th>
                    <th className="pb-2 text-sm font-medium text-gray-600 pr-4">Action</th>
                    <th className="pb-2 text-sm font-medium text-gray-600 pr-4">Model</th>
                    <th className="pb-2 text-sm font-medium text-gray-600 pr-4">Admin</th>
                    <th className="pb-2 text-sm font-medium text-gray-600">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLog.map((entry, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2 pr-4 text-sm text-gray-600">
                        {new Date(entry.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 text-sm text-gray-900 font-medium">{entry.action}</td>
                      <td className="py-2 pr-4 text-sm text-gray-600">{entry.model}</td>
                      <td className="py-2 pr-4 text-sm text-gray-600">{entry.admin}</td>
                      <td className="py-2 text-sm text-gray-600">{entry.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
