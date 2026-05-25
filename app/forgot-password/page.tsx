'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.ok) {
        setSent(true)
      } else {
        setError(data.error || 'Something went wrong')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-xl border border-white/10 bg-gray-800/50 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📧</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Check Your Email</h1>
          <p className="text-gray-400 mb-6">
            If an account exists with that email, we&apos;ve sent a reset link.
          </p>
          <Link href="/login" className="text-blue-400 hover:underline text-sm">
            Back to Login
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-gray-800/50 p-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">Forgot Password</h1>
            <p className="text-gray-400 text-sm">Enter your email to receive a reset link</p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Remember your password?{' '}
            <Link href="/login" className="text-blue-400 hover:underline">Login</Link>
          </p>
        </form>
      </div>
    </main>
  )
}
