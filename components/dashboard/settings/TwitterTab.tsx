'use client'

import { useState, useEffect } from 'react'

interface TwitterStatus {
  connected: boolean
  username: string | null
  userId: string | null
  expiresAt: string | null
}

export default function TwitterTab() {
  const [status, setStatus] = useState<TwitterStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  useEffect(() => {
    fetchStatus()
  }, [])

  // Show result from URL params after OAuth callback redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const connected = params.get('twitter_connected')
    const error = params.get('twitter_error')
    if (connected) {
      setMessage({ type: 'success', text: 'Twitter account connected successfully!' })
      fetchStatus()
      window.history.replaceState({}, '', '/dashboard/settings?tab=twitter')
    } else if (error) {
      const errorMessages: Record<string, string> = {
        auth_failed: 'Authorization failed. Please try again.',
        invalid_verifier: 'Security check failed. Please try again.',
        token_exchange_failed: 'Could not get access token from Twitter.',
        server_error: 'Server error. Please try again later.',
      }
      setMessage({ type: 'error', text: errorMessages[error] || 'An error occurred.' })
      window.history.replaceState({}, '', '/dashboard/settings?tab=twitter')
    }
  }, [])

  async function fetchStatus() {
    try {
      const res = await fetch('/api/auth/twitter/status')
      if (res.ok) setStatus(await res.json())
    } catch { /* ignore */ }
    setLoading(false)
  }

  async function disconnect() {
    if (!confirm('Disconnect Twitter? You will no longer be able to post automatically.')) return
    setDisconnecting(true)
    try {
      const res = await fetch('/api/auth/twitter/disconnect', { method: 'POST' })
      if (res.ok) {
        setStatus({ connected: false, username: null, userId: null, expiresAt: null })
        setMessage({ type: 'success', text: 'Twitter disconnected.' })
      } else {
        setMessage({ type: 'error', text: 'Failed to disconnect.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error.' })
    }
    setDisconnecting(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Twitter Integration</h2>
        <p className="text-sm text-gray-500 mt-1">
          Connect your Twitter account to enable automatic posting to your timeline.
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {status?.connected ? (
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1DA1F2] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">@{status.username}</p>
              <p className="text-sm text-gray-500">Connected Twitter Account</p>
            </div>
            <div className="ml-auto">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Connected
              </span>
            </div>
          </div>

          {status.expiresAt && (
            <p className="text-xs text-gray-400">
              Token expires: {new Date(status.expiresAt).toLocaleString()}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <a
              href="/api/auth/twitter/connect"
              className="px-4 py-2 bg-[#1DA1F2] hover:bg-[#1a91da] text-white text-sm font-medium rounded-lg transition-colors"
            >
              Reconnect
            </a>
            <button
              onClick={disconnect}
              disabled={disconnecting}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {disconnecting ? 'Disconnecting...' : 'Disconnect'}
            </button>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#1DA1F2]/10 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-[#1DA1F2]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-gray-900">Connect Twitter</p>
            <p className="text-sm text-gray-500 mt-1">
              Authorize Hostamar to post tweets on your behalf
            </p>
          </div>
          <a
            href="/api/auth/twitter/connect"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#1DA1F2] hover:bg-[#1a91da] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Connect Twitter Account
          </a>
        </div>
      )}

      <div className="bg-blue-50 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>How it works:</strong> When you publish a video or service on Hostamar,
          you can choose to automatically post about it on Twitter. Your access token
          is stored securely and never shared.
        </p>
      </div>
    </div>
  )
}