'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const GREEN = '#0E7C3A'

export default function DevelopersPage() {
  const [apiKey, setApiKey] = useState('')
  const [name, setName] = useState('')
  const [keys, setKeys] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    // Check if user has auth token
    const token = document.cookie.split('; ').find(c => c.startsWith('auth_token='))?.split('=')[1]
    if (token) {
      setAuthenticated(true)
      loadKeys()
    }
  }, [])

  const loadKeys = async () => {
    try {
      const res = await fetch('/api/keys', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setKeys(data.keys || [])
      }
    } catch {}
  }

  const createKey = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create key')
        return
      }
      setApiKey(data.key)
      setName('')
      loadKeys()
    } catch {
      setError('Network error')
    }
    setLoading(false)
  }

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#FCFCF9] text-zinc-900 antialiased">
      <div className="mx-auto max-w-[800px] px-4 py-12">
        <h1 className="text-3xl font-bold">Developer API</h1>
        <p className="mt-2 text-zinc-600">
          Integrate Hostamar AI into your applications. Generate images, videos, and chat with our API.
        </p>

        {/* Quick Start */}
        <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold">Quick Start</h2>
          <div className="mt-4 space-y-4">
            <div>
              <h3 className="font-medium">1. Get API Key</h3>
              <p className="text-sm text-zinc-600">Sign in and create an API key below</p>
            </div>
            <div>
              <h3 className="font-medium">2. Make API Call</h3>
              <div className="mt-2 rounded-lg bg-zinc-900 p-4 text-sm text-green-400 font-mono overflow-x-auto">
                <div>curl -X POST https://hostamar.com/api/ai/image/generate \</div>
                <div className="text-zinc-400">  -H "Authorization: Bearer hk_live_your_key_here" \</div>
                <div className="text-zinc-400">  -H "Content-Type: application/json" \</div>
                <div className="text-zinc-400">  -d '{`{"prompt": "professional product photo", "width": 1024, "height": 1024}`}'</div>
              </div>
            </div>
            <div>
              <h3 className="font-medium">3. Get Response</h3>
              <div className="mt-2 rounded-lg bg-zinc-900 p-4 text-sm text-green-400 font-mono overflow-x-auto">
                <div>{`{`}</div>
                <div>  "success": true,</div>
                <div>  "images": ["https://comfy.hostamar.com/view?filename=..."],</div>
                <div>  "model": "sd_xl_turbo_1.0_fp16.safetensors",</div>
                <div>  "seed": 123456789,</div>
                <div>  "steps": 4</div>
                <div>{`}`}</div>
              </div>
            </div>
          </div>
        </section>

        {/* API Key Management */}
        {authenticated ? (
          <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="text-xl font-semibold">Your API Keys</h2>
            
            {apiKey && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-800">Your new API key (copy it now - it won't be shown again):</p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 rounded bg-white px-3 py-2 text-sm font-mono text-zinc-900 border border-amber-200 overflow-x-auto">
                    {apiKey}
                  </code>
                  <button
                    onClick={copyKey}
                    className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={createKey} className="mt-4 flex gap-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Key name (e.g., Production)"
                className="flex-1 rounded-lg border border-zinc-200 px-4 py-2 text-sm focus:outline-none focus:border-[#0E7C3A]"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-[#0E7C3A] px-6 py-2 text-sm font-medium text-white hover:bg-[#0c6a32] disabled:bg-zinc-300"
              >
                {loading ? 'Creating...' : 'Create Key'}
              </button>
            </form>

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

            {keys.length > 0 && (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-left text-zinc-500">
                      <th className="pb-2 pr-4">Name</th>
                      <th className="pb-2 pr-4">Image</th>
                      <th className="pb-2 pr-4">Video</th>
                      <th className="pb-2 pr-4">Chat</th>
                      <th className="pb-2 pr-4">Requests</th>
                      <th className="pb-2 pr-4">Last Used</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map((k) => (
                      <tr key={k.id} className="border-b border-zinc-100">
                        <td className="py-3 pr-4 font-medium">{k.name}</td>
                        <td className="py-3 pr-4">{k.canGenerateImage ? '✅' : '❌'}</td>
                        <td className="py-3 pr-4">{k.canGenerateVideo ? '✅' : '❌'}</td>
                        <td className="py-3 pr-4">{k.canUseChat ? '✅' : '❌'}</td>
                        <td className="py-3 pr-4">{k.totalRequests}</td>
                        <td className="py-3 pr-4 text-zinc-500">{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never'}</td>
                        <td className="py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs ${k.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {k.isActive ? 'Active' : 'Revoked'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : (
          <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 text-center">
            <p className="text-zinc-600">Sign in to manage API keys</p>
            <Link
              href="/login?ref=developers"
              className="mt-4 inline-flex h-11 items-center rounded-full px-6 font-semibold text-white"
              style={{ background: GREEN }}
            >
              Sign In
            </Link>
          </section>
        )}

        {/* API Reference */}
        <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold">API Reference</h2>
          <div className="mt-4 space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">POST</span>
                <code className="text-sm">/api/ai/image/generate</code>
              </div>
              <p className="mt-1 text-sm text-zinc-600">Generate an image from a text prompt</p>
              <div className="mt-2 text-sm text-zinc-500">
                <strong>Body:</strong> prompt (string), negativePrompt (string), width (int), height (int), steps (int), cfg (float), model (string)
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">GET</span>
                <code className="text-sm">/api/ai/image/generate</code>
              </div>
              <p className="mt-1 text-sm text-zinc-600">List available models</p>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-xl font-semibold">Pricing</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 p-4">
              <h3 className="font-medium">Free</h3>
              <p className="mt-1 text-2xl font-bold">৳0<span className="text-sm font-normal text-zinc-500">/mo</span></p>
              <ul className="mt-3 space-y-1 text-sm text-zinc-600">
                <li>• 10 images/day</li>
                <li>• 1 video/day</li>
                <li>• 100 chat messages/day</li>
              </ul>
            </div>
            <div className="rounded-xl border-2 border-[#0E7C3A] p-4">
              <h3 className="font-medium">Pro</h3>
              <p className="mt-1 text-2xl font-bold">৳500<span className="text-sm font-normal text-zinc-500">/mo</span></p>
              <ul className="mt-3 space-y-1 text-sm text-zinc-600">
                <li>• 100 images/day</li>
                <li>• 10 videos/day</li>
                <li>• Unlimited chat</li>
                <li>• Priority queue</li>
              </ul>
            </div>
            <div className="rounded-xl border border-zinc-200 p-4">
              <h3 className="font-medium">Business</h3>
              <p className="mt-1 text-2xl font-bold">৳2,000<span className="text-sm font-normal text-zinc-500">/mo</span></p>
              <ul className="mt-3 space-y-1 text-sm text-zinc-600">
                <li>• Unlimited images</li>
                <li>• 50 videos/day</li>
                <li>• Unlimited chat</li>
                <li>• API access</li>
                <li>• Custom models</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
