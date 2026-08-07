'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { SSOButton } from '@/components/auth/SSOButton'

// Real auth flow preserved: credentials POST /api/auth/login -> auth_token cookie -> /dashboard
export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        let errorMsg = 'লগইন ব্যর্থ।'
        try {
          const data = await res.json()
          errorMsg = data.error || errorMsg
        } catch {
          errorMsg = res.status === 500
            ? 'সার্ভার সমস্যা (DB সংযোগ ব্যর্হত)। দয়া করে পরে আবার চেষ্টা করুন।'
            : 'লগইন করতে সমস্যা হয়েছে।'
        }
        setError(errorMsg)
        setLoading(false)
        return
      }

      const data = await res.json()
      if (!data.token) {
        setError('লগইন ব্যর্থ।')
        setLoading(false)
        return
      }

      window.localStorage.setItem('auth_token', data.token)
      router.push('/dashboard')
    } catch {
      setError('সার্ভার সমস্যা। পুনরায় চেষ্টা করুন।')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FCFCF9] text-zinc-900 antialiased grid md:grid-cols-[55%_45%]">
      {/* LEFT: form */}
      <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-zinc-500 hover:text-zinc-800 transition mb-6">
            <ArrowLeft className="w-4 h-4" /> ← Back to Home
          </Link>

          <h1 className="text-[28px] font-bold">Welcome Back</h1>
          <p className="bangla text-[14px] text-zinc-600 mt-2 leading-[1.6]">
            আপনার অ্যাকাউন্টে লগইন করুন
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-600 px-4 py-3 rounded-lg mt-5 text-[13.5px]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div>
              <label className="block text-zinc-700 text-sm font-medium mb-2 bangla">
                ইমেইল অ্যাড্রেস
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-[14px] focus:outline-none focus:border-[#0E7C3A] transition"
                placeholder="example@email.com"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-zinc-700 text-sm font-medium mb-2 bangla">
                পাসওয়ার্ড
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-10 bg-white border border-zinc-200 rounded-xl text-[14px] focus:outline-none focus:border-[#0E7C3A] transition"
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0E7C3A] hover:bg-[#0c6a32] disabled:bg-zinc-300 text-white font-semibold py-3 rounded-xl transition text-[14px] flex items-center justify-center gap-2"
            >
              {loading ? 'লগইন হচ্ছে...' : 'লগইন করুন →'}
            </button>

            <div className="flex items-center gap-3 my-1">
              <div className="h-px bg-zinc-200 flex-1" />
              <span className="text-[12px] text-zinc-400">অথবা</span>
              <div className="h-px bg-zinc-200 flex-1" />
            </div>

            <SSOButton mode="login" />

            <p className="text-center text-[13px] text-zinc-500">
              অ্যাকাউন্ট নেই?{' '}
              <Link href="/signup" className="text-[#0E7C3A] font-medium hover:underline">
                এখাতে রেজিস্টার করুন
              </Link>
            </p>
          </form>
        </div>
      </div>

      {/* RIGHT: value panel */}
      <div className="bg-[#0E7C3A] text-white px-6 py-10 hidden md:flex flex-col justify-center">
        <h2 className="text-[24px] font-bold leading-snug">বাংলাদেশের সবচেয়ে সাশ্রয়ী AI প্ল্যাটফর্ম</h2>
        <p className="text-[14px] text-white/80 mt-2 leading-[1.6]">ভিডিও, হোস্টিং, চ্যাট, ব্রাউজার, IDE ও গেমিং — এক সাবস্ক্রিপশনে।</p>

        <div className="grid grid-cols-3 gap-3 mt-6">
          {['Video', 'Hosting', 'Chat', 'Browser', 'IDE', 'Gaming'].map((p) => (
            <div key={p} className="bg-white/10 rounded-xl py-3 text-center text-[13px] font-medium">{p}</div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          {[['20ms', 'BD ping'], ['99.9%', 'uptime'], ['12 min', 'support']].map(([n, l]) => (
            <div key={l} className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-[20px] font-bold">{n}</div>
              <div className="text-[12px] text-white/70">{l}</div>
            </div>
          ))}
        </div>

        <ul className="mt-6 space-y-2 text-[13.5px]">
          {[
            '✓ 5GB Hosting Free',
            '✓ 3 Videos Free',
            '✓ bKash Payment',
            '✓ বাংলা সাপোর্ট',
          ].map((c) => (
            <li key={c} className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {c}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
