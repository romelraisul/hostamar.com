"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useLocale } from "@/lib/locale-context"

export default function LoginPage() {
  const { t } = useLocale()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || t('login.errorInvalid') || "ইমেইল বা পাসওয়ার্ড ভুল। আবার চেষ্টা করুন।")
      } else {
        router.push("/dashboard")
        router.refresh()
      }
    } catch (err) {
      setError(t('login.errorGeneric') || "লগইন করতে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-fadeIn">
        <div className="bg-gray-800 rounded-2xl p-8 shadow-xl border border-gray-700">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">{t('login.brandName')}</h1>
            <p className="text-gray-400 text-sm">{t('login.brandSubtitle')}</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                {t('login.emailLabel')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                placeholder={t('login.emailPlaceholder')}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                {t('login.passwordLabel')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                placeholder={t('login.passwordPlaceholder')}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-3 rounded-lg transition duration-200 text-sm"
            >
              {loading ? t('login.loggingIn') : t('login.loginBtn')}
            </button>
          </form>

          <div className="mt-2 text-right">
            <a href="/forgot-password" className="text-gray-400 hover:text-gray-200 text-sm">
              Forgot password?
            </a>
          </div>

          <p className="text-center text-gray-400 text-sm mt-6">
            {t('login.noAccount')}{" "}
            <a href="/signup" className="text-blue-400 hover:underline font-medium">
              {t('login.register')}
            </a>
          </p>

          <div className="mt-6 pt-6 border-t border-gray-700">
            <p className="text-center text-gray-500 text-xs">
              <a href="/" className="hover:text-gray-300">{t('login.backToHome')}</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
