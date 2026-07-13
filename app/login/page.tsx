'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Eye, EyeOff, Check, Loader2, ShieldCheck, X } from 'lucide-react'

// Real auth flow preserved: POST /api/auth/login -> /dashboard (same endpoint the new
// /signup auto-login uses). Forgot-password modal calls the REAL /api/auth/forgot-password
// which sends a RESET LINK (not an OTP — the preview's "OTP sent" is factually wrong;
// endpoint returns {success, message:'If the email exists, a reset link has been sent.'}).
// REJECTED from preview: Google/Facebook login (no OAuth providers in lib/auth-config.ts
// -> would 500), fake pre-login "আপনার শেষ ভিডিও: Eid Offer" personalized card (user isn't
// authenticated yet — impossible), '500+ active now' + testimonial (fabricated), '99.98%'
// (we cite 99.9%), unbuilt-feature teasers (bKash-number login, 'য-ফলা fixed' badge), and
// 'studio.hostamar.com' redirect (doesn't exist; real is /dashboard).

const PRODUCTS = ['Video', 'Hosting', 'Chat', 'Browser', 'IDE', 'Gaming']

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // forgot-password modal
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotMsg, setForgotMsg] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const formValid = emailValid && password.length > 0

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
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'ইমেইল বা পাসওয়ার্ড ভুল। আবার চেষ্টা করুন।')
        setLoading(false)
        return
      }
      if (data.token && typeof window !== 'undefined') {
        window.localStorage.setItem('auth_token', data.token)
      }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('লগইন করতে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।')
      setLoading(false)
    }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotLoading(true)
    setForgotMsg('')
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      })
      // Endpoint always returns the same safe message (reset link, not OTP).
      setForgotMsg('যদি এই ইমেইলে একাউন্ট থাকে, রিসেট লিংক পাঠানো হয়েছে।')
    } catch {
      setForgotMsg('অনুরোধ পাঠাতে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।')
    } finally {
      setForgotLoading(false)
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

          <h1 className="text-[28px] font-bold">Welcome back</h1>
          <p className="bangla text-[14px] text-zinc-600 mt-2 leading-[1.6]">আবার স্বাগতম! আপনার ভিডিও, হোস্টিং, গেম সব রেডি।</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-600 px-4 py-3 rounded-lg mt-5 text-[13.5px]">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-[14px] focus:outline-none focus:border-[#0E7C3A] transition"
                placeholder="ইমেইল ঠিকানা" disabled={loading}
              />
              {email.length > 0 && !emailValid && <p className="text-[12px] text-red-600 mt-1">সঠিক ইমেইল দিন।</p>}
            </div>

            <div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required
                  className="w-full px-4 py-3 pr-10 bg-white border border-zinc-200 rounded-xl text-[14px] focus:outline-none focus:border-[#0E7C3A] transition"
                  placeholder="পাসওয়ার্ড" disabled={loading}
                />
                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[13px]">
              <label className="flex items-center gap-2 text-zinc-600">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} disabled={loading} /> মনে রাখুন
              </label>
              <button type="button" onClick={() => setForgotOpen(true)} className="text-[#0E7C3A] hover:underline">পাসওয়ার্ড ভুলে গেছি?</button>
            </div>

            <button
              type="submit" disabled={!formValid || loading}
              className="w-full bg-[#0E7C3A] hover:bg-[#0c6a32] disabled:bg-zinc-300 text-white font-semibold py-3 rounded-xl transition text-[14px] flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> লগইন হচ্ছে...</> : 'লগইন করুন →'}
            </button>

            <div className="flex items-center gap-3 my-1">
              <div className="h-px bg-zinc-200 flex-1" />
              <span className="text-[12px] text-zinc-400">অথবা</span>
              <div className="h-px bg-zinc-200 flex-1" />
            </div>
            <p className="text-center text-[13px] text-zinc-500">
              Don&apos;t have account? <a href="/signup" className="text-[#0E7C3A] font-medium hover:underline">Create free account</a>
            </p>
          </form>

          <div className="flex flex-wrap gap-2 mt-5">
            {['20ms BD ping', '12 min support'].map((p) => (
              <span key={p} className="text-[11.5px] px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-600 flex items-center gap-1">
                <Check className="w-3 h-3 text-[#0E7C3A]" /> {p}
              </span>
            ))}
            {['Encrypted', 'BDIX DC', 'No data-share'].map((p) => (
              <span key={p} className="text-[11.5px] px-2.5 py-1 rounded-full bg-[#0E7C3A]/[0.08] text-[#0E7C3A] flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> {p}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT: value panel */}
      <div className="bg-[#0E7C3A] text-white px-6 py-10 hidden md:flex flex-col justify-center relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 -left-20 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
        <div className="relative">
          <h2 className="text-[24px] font-bold leading-snug">ফিরে আসার কারণ</h2>
          <p className="text-[14px] text-white/80 mt-2 leading-[1.6]">এক লগইনে ভিডিও, হোস্টিং, চ্যাট, ব্রাউজার, IDE ও গেমিং।</p>

          <div className="grid grid-cols-3 gap-3 mt-6">
            {PRODUCTS.map((p) => (
              <div key={p} className="bg-white/10 rounded-xl py-3 text-center text-[13px] font-medium">{p}</div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            {[['20ms', 'BD ping'], ['99.9%', 'uptime']].map(([n, l]) => (
              <div key={l} className="bg-white/5 rounded-xl p-3 text-center">
                <div className="text-[20px] font-bold">{n}</div>
                <div className="text-[12px] text-white/70">{l}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl bg-white/10 p-4">
            <p className="text-[13px] text-white/90">সব প্রোডাক্ট এক সাবস্ক্রিপশনে — bKash / Nagad / Rocket দিয়ে পেমেন্ট, কোনো ডলার কার্ড লাগে না।</p>
          </div>
        </div>
      </div>

      {/* Forgot-password modal (real endpoint: reset link, not OTP) */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4" onClick={() => setForgotOpen(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[16px] font-semibold">পাসওয়ার্ড রিসেট</h3>
              <button onClick={() => setForgotOpen(false)} className="text-zinc-400"><X className="w-4 h-4" /></button>
            </div>
            {forgotMsg ? (
              <div className="bg-[#0E7C3A]/[0.08] text-[#0E7C3A] rounded-lg px-4 py-3 text-[13.5px]">{forgotMsg}</div>
            ) : (
              <form onSubmit={handleForgot} className="space-y-3">
                <p className="bangla text-[13px] text-zinc-600">আপনার ইমেইল দিন — রিসেট লিংক পাঠানো হবে।</p>
                <input
                  type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required
                  className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-[14px] focus:outline-none focus:border-[#0E7C3A]"
                  placeholder="ইমেইল ঠিকানা" disabled={forgotLoading}
                />
                <button type="submit" disabled={forgotLoading} className="w-full bg-[#0E7C3A] hover:bg-[#0c6a32] disabled:bg-zinc-300 text-white font-semibold py-2.5 rounded-xl text-[14px] flex items-center justify-center gap-2">
                  {forgotLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> পাঠানো হচ্ছে...</> : 'রিসেট লিংক পাঠান'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
