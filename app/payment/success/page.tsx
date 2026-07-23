'use client'
export const dynamic = 'force-dynamic'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { useLocale } from '@/lib/locale-context'

function SuccessContent() {
  const { t } = useLocale()
  const searchParams = useSearchParams()
  const credits = searchParams.get('credits') || '0'

  return (
    <main className="min-h-screen bg-[#FCFCF9] text-zinc-900 antialiased flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-[24px] border border-[#0E7C3A]/30 bg-white p-8 text-center shadow-sm">
        <div className="w-16 h-16 rounded-full bg-[#0E7C3A]/10 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">✅</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">{t('payment.successful')}</h1>
        <p className="text-zinc-500 mb-6">
          <span className="text-[#0E7C3A] font-bold text-2xl">{credits}</span> {t('payment.creditsAdded')}
        </p>
        <Link
          href="/dashboard"
          className="inline-block bg-[#0E7C3A] hover:bg-[#0c6a32] text-white font-semibold px-6 py-3 rounded-full transition"
        >
          {t('payment.goToDashboard')}
        </Link>
      </div>
    </main>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="text-center text-zinc-400 py-20">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  )
}
