'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Copy, Check, ExternalLink, Shield, Video, MessageSquare, Image } from 'lucide-react'

interface ApiKey {
  id: string
  name: string
  canGenerateImage: boolean
  canGenerateVideo: boolean
  canUseChat: boolean
  rateLimitPerMinute: number
  totalRequests: number
  lastUsedAt: string | null
  isActive: boolean
  expiresAt: string | null
  createdAt: string
  key?: string // Only shown once on creation
}

export default function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyPermissions, setNewKeyPermissions] = useState({
    canGenerateImage: true,
    canGenerateVideo: true,
    canUseChat: true,
  })
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null)

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/keys', { credentials: 'include', cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setKeys(data.keys || [])
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchKeys()
  }, [])

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return

    setCreating(true)
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newKeyName, permissions: newKeyPermissions }),
      })

      if (res.ok) {
        const data = await res.json()
        setCreatedKey(data.key)
        setShowCreateModal(false)
        setNewKeyName('')
        fetchKeys()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to create API key')
      }
    } catch (error) {
      console.error('Failed to create API key:', error)
      alert('Failed to create API key')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return

    try {
      const res = await fetch(`/api/keys/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (res.ok) {
        fetchKeys()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to delete API key')
      }
    } catch (error) {
      console.error('Failed to delete API key:', error)
      alert('Failed to delete API key')
    }
  }

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    setCopiedKeyId(key.substring(0, 8))
    setTimeout(() => setCopiedKeyId(null), 2000)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  // Show created key modal
  if (createdKey) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-6 max-w-md w-full">
          <h2 className="text-xl font-bold text-gray-900 mb-4">API Key Created Successfully!</h2>
          <p className="text-gray-600 mb-4">
            Copy this key now — you won't be able to see it again.
          </p>
          <div className="relative mb-4">
            <input
              type="text"
              readOnly
              value={createdKey}
              className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 font-mono text-sm"
            />
            <button
              onClick={() => handleCopyKey(createdKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-600 hover:text-blue-800"
            >
              <Copy className="w-5 h-5" />
            </button>
          </div>
          <div className="text-xs text-gray-500 mb-4">
            {copiedKeyId === createdKey.substring(0, 8) ? 'Copied!' : 'Click copy icon to copy'}
          </div>
          <button
            onClick={() => setCreatedKey(null)}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            I've copied the key, continue
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">API Keys</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create API Key
        </button>
      </div>

      {keys.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No API Keys Yet</h3>
          <p className="text-gray-500 mb-6">Create an API key to access Hostamar services programmatically.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Your First API Key
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border divide-y overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 font-medium text-sm text-gray-700 grid grid-cols-12 gap-4">
            <span className="col-span-3">Name</span>
            <span className="col-span-2">Permissions</span>
            <span className="col-span-2">Rate Limit</span>
            <span className="col-span-2">Usage</span>
            <span className="col-span-2">Status</span>
            <span className="col-span-1 text-center">Actions</span>
          </div>
          {keys.map((key) => (
            <div key={key.id} className="px-4 py-3 hover:bg-gray-50 transition-colors grid grid-cols-12 gap-4 items-center">
              <div className="col-span-3">
                <p className="font-medium text-gray-900 truncate">{key.name}</p>
                <p className="text-xs text-gray-500">Created {formatDate(key.createdAt)}</p>
              </div>
              <div className="col-span-2 flex items-center gap-2 flex-wrap">
                {key.canUseChat && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-green-50 text-green-700 rounded-full">
                    <MessageSquare className="w-3 h-3" />
                    Chat
                  </span>
                )}
                {key.canGenerateVideo && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-full">
                    <Video className="w-3 h-3" />
                    Video
                  </span>
                )}
                {key.canGenerateImage && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                    <Image className="w-3 h-3" />
                    Image
                  </span>
                )}
              </div>
              <div className="col-span-2 text-sm text-gray-600">{key.rateLimitPerMinute}/min</div>
              <div className="col-span-2 text-sm text-gray-600">
                {key.totalRequests.toLocaleString()} requests
                {key.lastUsedAt && (
                  <span className="text-xs text-gray-400 ml-2">Last: {formatDate(key.lastUsedAt)}</span>
                )}
              </div>
              <div className="col-span-2">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${key.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {key.isActive ? 'Active' : 'Inactive'}
                </span>
                {key.expiresAt && (
                  <p className="text-xs text-gray-500 mt-1">Expires: {formatDate(key.expiresAt)}</p>
                )}
              </div>
              <div className="col-span-1 flex items-center justify-center gap-2">
                <button
                  onClick={() => handleDeleteKey(key.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New API Key</h2>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Key Name</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., Production App, Testing, CI/CD"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newKeyPermissions.canUseChat}
                      onChange={(e) => setNewKeyPermissions({ ...newKeyPermissions, canUseChat: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Chat (AI Chat)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newKeyPermissions.canGenerateVideo}
                      onChange={(e) => setNewKeyPermissions({ ...newKeyPermissions, canGenerateVideo: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Video Generation</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newKeyPermissions.canGenerateImage}
                      onChange={(e) => setNewKeyPermissions({ ...newKeyPermissions, canGenerateImage: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Image Generation</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateKey}
                disabled={creating || !newKeyName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create API Key'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}