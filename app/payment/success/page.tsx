'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function SuccessContent() {
  const searchParams = useSearchParams()
  const credits = searchParams.get('credits') || '0'

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-xl border border-green-500/30 bg-gray-800 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">✅</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Payment Successful!</h1>
        <p className="text-gray-400 mb-6">
          <span className="text-green-400 font-bold text-2xl">{credits}</span> credits added to your account
        </p>
        <Link
          href="/dashboard"
          className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg transition"
        >
          Go to Dashboard
        </Link>
      </div>
    </main>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="text-center text-gray-400 py-20">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  )
}
