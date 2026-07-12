'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

type Status = 'pending' | 'paid' | 'failed' | 'not_found' | 'loading'

function BillingSuccessInner() {
  const params = useSearchParams()
  const invoice = params.get('invoice') || ''
  const [status, setStatus] = useState<Status>('loading')
  const [detail, setDetail] = useState<{ amount?: number; plan?: string | null; currency?: string }>({})

  useEffect(() => {
    if (!invoice) {
      setStatus('not_found')
      return
    }
    let tries = 0
    const poll = async () => {
      tries += 1
      try {
        const res = await fetch(`/api/billing/status?invoiceNumber=${encodeURIComponent(invoice)}`)
        const data = await res.json()
        if (res.ok && data.status === 'paid') {
          setStatus('paid')
          setDetail({ amount: data.amount, plan: data.plan, currency: data.currency })
          return
        }
        if (data.status === 'failed') {
          setStatus('failed')
          return
        }
        if (tries < 20) {
          setTimeout(poll, 2000)
        } else {
          setStatus('pending')
        }
      } catch {
        if (tries < 20) setTimeout(poll, 2000)
        else setStatus('pending')
      }
    }
    poll()
  }, [invoice])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FCFCF9] px-4">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        {status === 'loading' && <Spinner />}
        {status === 'pending' && (
          <>
            <div className="text-4xl mb-3">⏳</div>
            <h1 className="bangla text-xl font-semibold">পেমেন্ট প্রসেস হচ্ছে…</h1>
            <p className="bangla mt-2 text-sm text-zinc-500">bKash থেকে কনফার্মেশন আসছে। দয়া করে পেজটি বন্ধ করবেন না।</p>
          </>
        )}
        {status === 'paid' && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#0E7C3A] text-3xl text-white">✓</div>
            <h1 className="bangla text-xl font-semibold">পেমেন্ট সফল হয়েছে!</h1>
            <p className="bangla mt-2 text-sm text-zinc-600">
              {detail.plan ? `${detail.plan} প্ল্যান অ্যাকটিভ। ` : ''}
              {typeof detail.amount === 'number' ? `৳${detail.amount.toLocaleString('en-IN')} পে করা হয়েছে।` : ''}
            </p>
            <p className="mt-1 text-[11px] text-zinc-400">Invoice: {invoice}</p>
          </>
        )}
        {status === 'failed' && (
          <>
            <div className="text-4xl mb-3">✕</div>
            <h1 className="bangla text-xl font-semibold text-red-600">পেমেন্ট ব্যর্থ হয়েছে</h1>
            <p className="bangla mt-2 text-sm text-zinc-500">আবার চেষ্টা করুন বা সাপোর্টে যোগাযোগ করুন।</p>
          </>
        )}
        {status === 'not_found' && (
          <>
            <div className="text-4xl mb-3">?</div>
            <h1 className="bangla text-xl font-semibold">ইনভয়েস খুঁজে পাওয়া যায়নি</h1>
          </>
        )}
        <Link href="/pricing" className="bangla mt-6 inline-block text-[13px] font-medium text-[#0E7C3A] hover:underline">
          ← প্রাইসিং-এ ফিরে যান
        </Link>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-zinc-200 border-t-[#0E7C3A]" />
  )
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#FCFCF9]"><div className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-200 border-t-[#0E7C3A]" /></div>}>
      <BillingSuccessInner />
    </Suspense>
  )
}
