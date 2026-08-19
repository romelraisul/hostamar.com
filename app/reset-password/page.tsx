'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { useLocale } from '@/lib/locale-context'

function ForgotPasswordForm() {
  const { t } = useLocale()
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
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-[#0E7C3A]/10 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">📧</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">{t('forgotPassword.checkEmail')}</h1>
        <p className="text-zinc-500 mb-6">
          {t('forgotPassword.checkEmailMsg')}
        </p>
        <Link href="/login" className="text-[#0E7C3A] hover:underline text-sm">
          {t('forgotPassword.backToLogin')}
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold mb-2">{t('forgotPassword.title')}</h1>
        <p className="text-zinc-500 text-sm">{t('forgotPassword.subtitle')}</p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>
      )}

      <div>
        <label className="block text-sm text-zinc-600 mb-1">{t('forgotPassword.emailLabel')}</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E7C3A]/20 focus:border-[#0E7C3A]"
          placeholder={t('forgotPassword.emailPlaceholder')}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#0E7C3A] hover:bg-[#0c6a32] disabled:opacity-50 text-white font-medium py-2.5 rounded-full transition"
      >
        {loading ? t('forgotPassword.sending') : t('forgotPassword.sendReset')}
      </button>

      <p className="text-center text-sm text-zinc-500">
        {t('forgotPassword.rememberPassword')}{' '}
        <Link href="/login" className="text-[#0E7C3A] hover:underline">{t('nav.login')}</Link>
      </p>
    </form>
  )
}

function ResetPasswordForm() {
  const { t } = useLocale()
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">{t('resetPassword.invalidLink')}</h1>
        <p className="text-zinc-500 mb-4">{t('resetPassword.invalidLinkMsg')}</p>
        <Link href="/forgot-password" className="text-[#0E7C3A] hover:underline">{t('resetPassword.requestNew')}</Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-[#0E7C3A]/10 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">✅</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">{t('resetPassword.resetDone')}</h1>
        <p className="text-zinc-500 mb-6">{t('resetPassword.resetDoneMsg')}</p>
        <Link href="/login" className="text-[#0E7C3A] hover:underline">{t('resetPassword.loginWithNew')}</Link>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (res.ok) {
        setDone(true)
      } else {
        setError(data.error || 'Failed to reset password')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold mb-2">{t('resetPassword.setNewPassword')}</h1>
        <p className="text-zinc-500 text-sm">{t('resetPassword.enterNewPassword')}</p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>
      )}

      <div>
        <label className="block text-sm text-zinc-600 mb-1">{t('resetPassword.newPasswordLabel')}</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E7C3A]/20 focus:border-[#0E7C3A]"
        />
      </div>

      <div>
        <label className="block text-sm text-zinc-600 mb-1">{t('resetPassword.confirmPasswordLabel')}</label>
        <input
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          required
          minLength={6}
          className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E7C3A]/20 focus:border-[#0E7C3A]"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#0E7C3A] hover:bg-[#0c6a32] disabled:opacity-50 text-white font-medium py-2.5 rounded-full transition"
      >
        {loading ? t('resetPassword.resetting') : t('resetPassword.resetBtn')}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  const { t } = useLocale()
  return (
    <main className="min-h-screen bg-[#FCFCF9] text-zinc-900 antialiased flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-[24px] border border-zinc-200 bg-white p-8 shadow-sm">
        <Suspense fallback={<div className="text-center text-zinc-400">{t('common.loading') || 'Loading...'}</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  )
}
