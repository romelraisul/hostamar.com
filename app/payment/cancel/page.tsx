'use client'

import Link from 'next/link'
import { useLocale } from '@/lib/locale-context'

export default function CancelPage() {
  const { t } = useLocale()
  return (
    <main className="min-h-screen bg-[#FCFCF9] text-zinc-900 antialiased flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-[24px] border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">⏸️</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">{t('payment.cancelled')}</h1>
        <p className="text-zinc-500 mb-6">
          {t('payment.cancelledMsg')}
        </p>
        <Link
          href="/payment"
          className="inline-block bg-[#0E7C3A] hover:bg-[#0c6a32] text-white font-semibold px-6 py-3 rounded-full transition"
        >
          {t('payment.backToPlans')}
        </Link>
      </div>
    </main>
  )
}
