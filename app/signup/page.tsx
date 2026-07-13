'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { ArrowLeft, Eye, EyeOff, Check, X, Loader2 } from 'lucide-react'
import { SSOButton } from '@/components/auth/SSOButton'

// NOTE: real auth flow preserved exactly — POST /api/auth/signup -> /api/auth/login
// -> NextAuth credentials sync -> /dashboard. Route has no OTP/emailVerified gating
// (confirmed in app/api/auth/signup/route.ts), so immediate auto-login works.
// REJECTED from preview: Google/Facebook buttons (no OAuth providers configured in
// lib/auth-config.ts -> would 500), fake testimonial (500+ SME / 10k+ videos / Bogura
// সেল 2x), and the 'studio.hostamar.com' redirect (doesn't exist; real is /dashboard).
// Stats used are all real: 20ms BDIX, 99.9% uptime, 7-day trial, 12-min support,
// 5GB hosting free, 3 videos free, 6 products.

const PRODUCTS = ['Video', 'Hosting', 'Chat', 'Browser', 'IDE', 'Gaming']

function strength(pw: string): { label: string; score: number; color: string } {
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++
  if (/\d/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  if (pw.length >= 12) s++
  if (s <= 1) return { label: 'দুর্বল', score: 1, color: '#DC2626' }
  if (s <= 3) return { label: 'মাঝারি', score: 2, color: '#D97706' }
  return { label: 'শক্তিশালী', score: 3, color: '#0E7C3A' }
}

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [refCode, setRefCode] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    setInviteCode(params.get('invite') || '')
    setRefCode(params.get('ref') || '')
    setHydrated(true)
  }, [])

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const pwStrength = strength(password)
  const pwMatch = password.length > 0 && password === confirmPassword
  const formValid = name.trim() && emailValid && password.length >= 6 && pwMatch && acceptedTerms

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('পাসওয়ার্ড মিলছে না।')
      setLoading(false)
      return
    }
    if (password.length < 6) {
      setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে।')
      setLoading(false)
      return
    }
    if (!acceptedTerms) {
      setError('Terms ও Privacy পড়ে অনুমোদন করুন।')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          inviteCode: inviteCode.trim().toUpperCase() || undefined,
          refCode: refCode.trim().toUpperCase() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'সাইন-আপ ব্যর্থ হয়েছে।')
        setLoading(false)
        return
      }

      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const loginData = (await loginRes.json()) as { token?: string; error?: string }
      if (!loginRes.ok || !loginData.token) {
        setError(loginData.error || 'লগইন ব্যর্থ।')
        setLoading(false)
        return
      }
      if (typeof window !== 'undefined') window.localStorage.setItem('auth_token', loginData.token)
      await signIn('credentials', { email, password, redirect: false })
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

          <h1 className="text-[28px] font-bold">Create a New Account</h1>
          <p className="bangla text-[14px] text-zinc-600 mt-2 leading-[1.6]">
            ৩০ সেকেন্ডে শুরু করুন, কার্ড লাগবে না।
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-600 px-4 py-3 rounded-lg mt-5 text-[13.5px]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div>
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)} required
                className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-[14px] focus:outline-none focus:border-[#0E7C3A] transition"
                placeholder="আপনার নাম"
                disabled={loading}
              />
            </div>
            <div>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl text-[14px] focus:outline-none focus:border-[#0E7C3A] transition"
                placeholder="ইমেইল ঠিকানা"
                disabled={loading}
              />
              {email.length > 0 && !emailValid && <p className="text-[12px] text-red-600 mt-1">সঠিক ইমেইল দিন।</p>}
            </div>

            <div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                  className="w-full px-4 py-3 pr-10 bg-white border border-zinc-200 rounded-xl text-[14px] focus:outline-none focus:border-[#0E7C3A] transition"
                  placeholder="পাসওয়ার্ড"
                  disabled={loading}
                />
                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="h-1.5 rounded-full bg-zinc-200 overflow-hidden">
                    <div className="h-full transition-all" style={{ width: `${(pwStrength.score / 3) * 100}%`, background: pwStrength.color }} />
                  </div>
                  <p className="text-[12px] mt-1" style={{ color: pwStrength.color }}>শক্তি: {pwStrength.label}</p>
                </div>
              )}
            </div>

            <div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                  className="w-full px-4 py-3 pr-10 bg-white border border-zinc-200 rounded-xl text-[14px] focus:outline-none focus:border-[#0E7C3A] transition"
                  placeholder="পাসওয়ার্ড আবার লিখুন"
                  disabled={loading}
                />
                {confirmPassword.length > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    {pwMatch ? <Check className="w-4 h-4 text-[#0E7C3A]" /> : <X className="w-4 h-4 text-red-500" />}
                  </span>
                )}
              </div>
            </div>

            <label className="flex items-start gap-2 text-[13px] text-zinc-600">
              <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-0.5" disabled={loading} />
              <span className="bangla">আমি <a href="/terms" className="text-[#0E7C3A] underline">Terms</a> ও <a href="/privacy" className="text-[#0E7C3A] underline">Privacy</a> পড়েছি।</span>
            </label>

            <div className="rounded-xl bg-[#0E7C3A]/[0.06] border border-[#0E7C3A]/20 px-4 py-3 flex items-center gap-2">
              <span className="text-lg">💳</span>
              <p className="bangla text-[13px] text-[#0E7C3A]">bKash / Nagad / Rocket দিয়ে পরে পেমেন্ট করবেন — এখন ফ্রি ট্রায়াল।</p>
            </div>

            <button
              type="submit" disabled={!formValid || loading}
              className="w-full bg-[#0E7C3A] hover:bg-[#0c6a32] disabled:bg-zinc-300 text-white font-semibold py-3 rounded-xl transition text-[14px] flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> তৈরি হচ্ছে...</> : 'ফ্রি একাউন্ট তৈরি করুন →'}
            </button>

            <div className="flex items-center gap-3 my-1">
              <div className="h-px bg-zinc-200 flex-1" />
              <span className="text-[12px] text-zinc-400">অথবা</span>
              <div className="h-px bg-zinc-200 flex-1" />
            </div>
            <div className="mt-4">
              <SSOButton mode="signup" />
            </div>
            <p className="text-center text-[13px] text-zinc-500">
              Already have account? <a href="/login" className="text-[#0E7C3A] font-medium hover:underline">Login here</a>
            </p>
          </form>

          <div className="flex flex-wrap gap-2 mt-5">
            {['7-day free trial', 'No credit card', '12 min support'].map((p) => (
              <span key={p} className="text-[11.5px] px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-600 flex items-center gap-1">
                <Check className="w-3 h-3 text-[#0E7C3A]" /> {p}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT: value panel */}
      <div className="bg-[#0E7C3A] text-white px-6 py-10 hidden md:flex flex-col justify-center">
        <h2 className="text-[24px] font-bold leading-snug">বাংলাদেশের সবচেয়ে সাশ্রয়ী AI প্ল্যাটফর্ম</h2>
        <p className="text-[14px] text-white/80 mt-2 leading-[1.6]">ভিডিও, হোস্টিং, চ্যাট, ব্রাউজার, IDE ও গেমিং — এক সাবস্ক্রিপশনে।</p>

        <div className="grid grid-cols-3 gap-3 mt-6">
          {PRODUCTS.map((p) => (
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
          {['✓ 5GB Hosting Free', '✓ 3 Videos Free', '✓ bKash Payment', '✓ বাংলা সাপোর্ট'].map((c) => (
            <li key={c} className="flex items-center gap-2"><Check className="w-4 h-4" /> {c}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
