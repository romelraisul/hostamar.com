'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function BillingErrorInner() {
  const params = useSearchParams()
  const reason = params.get('reason') || 'unknown'
  const messages: Record<string, string> = {
    invalid: 'অবৈধ রিকোয়েস্ট',
    bad_payment: 'পেমেন্ট আইডি সঠিক নয়',
    not_found: 'পেমেন্ট রেকর্ড পাওয়া যায়নি',
    unpaid: 'পেমেন্ট সম্পন্ন হয়নি',
    execute_failed: 'bKash ভেরিফিকেশন ব্যর্থ',
    unknown: 'কিছু একটা ভুল হয়েছে',
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FCFCF9] px-4">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <div className="text-4xl mb-3">✕</div>
        <h1 className="bangla text-xl font-semibold text-red-600">পেমেন্ট সমস্যা</h1>
        <p className="bangla mt-2 text-sm text-zinc-600">{messages[reason] || messages.unknown}</p>
        <p className="mt-1 text-[11px] text-zinc-400">Reason: {reason}</p>
        <Link href="/pricing" className="bangla mt-6 inline-block text-[13px] font-medium text-[#0E7C3A] hover:underline">
          ← প্রাইসিং-এ ফিরে যান
        </Link>
        <Link href="/support" className="bangla mt-2 block text-[13px] font-medium text-zinc-500 hover:underline">
          সাপোর্টে যোগাযোগ করুন
        </Link>
      </div>
    </div>
  )
}

export default function BillingErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#FCFCF9]" />}>
      <BillingErrorInner />
    </Suspense>
  )
}
