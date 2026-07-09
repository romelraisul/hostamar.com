'use client'
import { useLocale } from '@/lib/locale-context'
import Link from 'next/link'

export default function CTASection() {
  const { locale } = useLocale()
  const isBengali = locale === 'bn'

  return (
    <section className="py-20 bg-gradient-to-r from-emerald-600 to-blue-600 dark:from-emerald-800 dark:to-blue-900">
      <div className="max-w-4xl mx-auto px-4 text-center text-white">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          {isBengali ? 'আজই শুরু করুন — ৳0 থেকে' : 'Start today — from ৳0'}
        </h2>
        <p className="text-lg mb-8 opacity-90">
          {isBengali
            ? '৩০ সেকেন্ডে প্রথম ভিডিও বানান। ক্রেডিট কার্ড লাগে না।'
            : 'Make your first video in 30 seconds. No credit card needed.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup"
            className="px-8 py-4 bg-white text-emerald-700 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all"
          >
            {isBengali ? 'ফ্রি একাউন্ট খুলুন' : 'Create Free Account'}
          </Link>
          <Link
            href="/pricing"
            className="px-8 py-4 border-2 border-white text-white rounded-xl font-bold text-lg hover:bg-white/10 transition-all"
          >
            {isBengali ? 'প্ল্যান দেখুন' : 'View Plans'}
          </Link>
        </div>
      </div>
    </section>
  )
}
