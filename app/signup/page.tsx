"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { useLocale } from "@/lib/locale-context"

export default function SignupPage() {
  const { t } = useLocale()
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [inviteCode, setInviteCode] = useState(new URLSearchParams(window.location.search).get("invite") || "")
  const [refCode] = useState(new URLSearchParams(window.location.search).get("ref") || "")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (password !== confirmPassword) {
      setError(t('signup.errorPasswordMismatch'))
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError(t('signup.errorPasswordLength'))
      setLoading(false)
      return
    }

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        setError(data.error || t('signup.errorGeneric'))
        return
      }

      // Auto-login after successful signup
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const loginData = (await loginRes.json()) as { token?: string; error?: string }
      if (!loginRes.ok || !loginData.token) {
        setError(loginData.error || t('signup.errorGeneric'))
        return
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem("auth_token", loginData.token)
      }

      // Sync NextAuth session so dashboard layout works
      await signIn("credentials", { email, password, redirect: false })

      router.push("/dashboard")
    } catch (err) {
      setError(t('signup.errorGeneric'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-fadeIn">
        <div className="bg-gray-800 rounded-2xl p-8 shadow-xl border border-gray-700">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">{t('signup.brandName')}</h1>
            <p className="text-gray-400 text-sm">{t('signup.brandSubtitle')}</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                {t('signup.nameLabel')}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                placeholder={t('signup.namePlaceholder')}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                {t('signup.emailLabel')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                placeholder={t('signup.emailPlaceholder')}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                {t('signup.passwordLabel')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                placeholder={t('signup.passwordPlaceholder')}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                {t('signup.confirmLabel')}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                placeholder={t('signup.confirmPlaceholder')}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold py-3 rounded-lg transition duration-200 text-sm"
            >
              {loading ? t('signup.creating') : t('signup.signupBtn')}
            </button>
          </form>

          <p className="text-center text-gray-400 text-sm mt-6">
            {t('signup.hasAccount')}{" "}
            <a href="/login" className="text-blue-400 hover:underline font-medium">
              {t('signup.loginHere')}
            </a>
          </p>

          <div className="mt-6 pt-6 border-t border-gray-700">
            <p className="text-center text-gray-500 text-xs">
              <a href="/" className="hover:text-gray-300">{t('signup.backToHome')}</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
