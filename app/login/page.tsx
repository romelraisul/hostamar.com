"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // Check URL for auth error param (from NextAuth error redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('error') === 'true') {
      setError('ইমেইল বা পাসওয়ার্ড ভুল। আবার চেষ্টা করুন।')
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/dashboard"
      })

      if (result?.error) {
        setError("ইমেইল বা পাসওয়ার্ড ভুল। আবার চেষ্টা করুন।")
      } else if (result?.ok) {
        router.push("/dashboard")
      }
    } catch (err) {
      setError("লগইন করতে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-fadeIn">
        <div className="bg-gray-800 rounded-2xl p-8 shadow-xl border border-gray-700">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">হোস্টামার</h1>
            <p className="text-gray-400 text-sm">ভিডিও জেনারেশন প্ল্যাটফর্ম</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                ইমেইল অ্যাড্রেস
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                placeholder="example@email.com"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                পাসওয়ার্ড
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-3 rounded-lg transition duration-200 text-sm"
            >
              {loading ? "লগইন হচ্ছে..." : "লগইন করুন"}
            </button>
          </form>

          <p className="text-center text-gray-400 text-sm mt-6">
            অ্যাকাউন্ট নেই?{" "}
            <a href="/signup" className="text-blue-400 hover:underline font-medium">
              এখানে রেজিস্টার করুন
            </a>
          </p>

          <div className="mt-6 pt-6 border-t border-gray-700">
            <p className="text-center text-gray-500 text-xs">
              <a href="/" className="hover:text-gray-300">← হোমপেজে ফিরে যান</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}