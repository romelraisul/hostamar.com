'use client'

import { useCallback, useEffect, useState } from 'react'

interface ApiKey {
  id: string
  name: string
  canGenerateImage: boolean
  canGenerateVideo: boolean
  canUseChat: boolean
  rateLimitPerMinute: number
  totalRequests: number
  lastUsedAt?: string | null
  isActive: boolean
  expiresAt?: string | null
  createdAt: string
}

export default function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [perms, setPerms] = useState({ canUseChat: true, canGenerateImage: true, canGenerateVideo: true })
  const [newKey, setNewKey] = useState('')
  const [error, setError] = useState('')

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/keys')
      if (res.ok) {
        const data = await res.json()
        setKeys(data.keys || [])
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to load keys')
      }
    } catch {
      setError('Network error loading keys')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError('')
    setNewKey('')
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, permissions: perms }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Failed to create key')
      } else {
        setNewKey(data.key || '')
        setName('')
        fetchKeys()
      }
    } catch {
      setError('Network error creating key')
    } finally {
      setCreating(false)
    }
  }

  async function handleRevoke(id: string) {
    try {
      const res = await fetch(`/api/keys/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchKeys()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to revoke key')
      }
    } catch {
      setError('Network error revoking key')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium text-gray-900">API Keys</h2>

      {newKey && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-4">
          <p className="text-sm font-semibold text-green-800">নতুন API key (শুধু একবারই দেখানো হবে!):</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-white px-3 py-2 font-mono text-xs text-gray-800 border border-green-200">
              {newKey}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(newKey)}
              className="shrink-0 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700"
            >
              Copy
            </button>
          </div>
          <p className="mt-2 text-[11px] text-green-600">এই key আবার দেখা যাবে না — এখনই কপি করে রাখুন।</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{error}</div>
      )}

      <form onSubmit={handleCreate} className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Key name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. my-app-server"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-wrap gap-4">
          {(
            [
              ['canUseChat', 'Chat'],
              ['canGenerateImage', 'Image'],
              ['canGenerateVideo', 'Video'],
            ] as const
          ).map(([field, label]) => (
            <label key={field} className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={perms[field]}
                onChange={(e) => setPerms((p) => ({ ...p, [field]: e.target.checked }))}
              />
              {label}
            </label>
          ))}
        </div>
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300"
        >
          {creating ? 'Creating…' : 'Create key'}
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Permissions</th>
              <th className="px-4 py-2 font-medium">Requests</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {keys.map((k) => (
              <tr key={k.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{k.name}</p>
                  <p className="text-[11px] text-gray-400">{new Date(k.createdAt).toLocaleDateString()}</p>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {[k.canUseChat && 'chat', k.canGenerateImage && 'image', k.canGenerateVideo && 'video']
                    .filter(Boolean)
                    .join(', ')}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{k.totalRequests}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      k.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {k.isActive ? 'Active' : 'Revoked'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {k.isActive && (
                    <button
                      onClick={() => handleRevoke(k.id)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!keys.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                  No API keys yet. Create your first key above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
