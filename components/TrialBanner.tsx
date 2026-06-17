'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface TrialStatus {
  exists: boolean
  status: 'active' | 'expired' | 'converted' | 'cancelled' | 'missing'
  daysLeft: number
  hoursLeft: number
  isActive: boolean
  isExpired: boolean
  isConverted: boolean
  source: string | null
  planChosen: string | null
}

function bannerCopy(status: TrialStatus): { headline: string; subline: string; cta: string; tone: 'live' | 'urgent' | 'expired' | 'converted' | 'none' } {
  if (status.isConverted) {
    return {
      headline: 'আপনি সাবস্ক্রাইব করেছেন',
      subline: 'প্রতি মাসে আনলিমিটেড ভিডিও',
      cta: '',
      tone: 'converted',
    }
  }
  if (status.isExpired) {
    return {
      headline: 'আপনার ফ্রি ট্রায়াল শেষ',
      subline: 'আজই সাবস্ক্রাইব করুন — মাসে মাত্র ৳১,০০০',
      cta: 'এখনই ৫০% ছাড়ে নিন',
      tone: 'expired',
    }
  }
  if (status.isActive && status.daysLeft > 1) {
    return {
      headline: `আপনার ট্রায়াল — দিন ${7 - status.daysLeft + 1} / 7`,
      subline: `${status.daysLeft} দিন বাকি। EARLY50 দিয়ে ৫০% ছাড় পেতে পারেন।`,
      cta: 'এখনই সাবস্ক্রাইব করুন',
      tone: 'live',
    }
  }
  return {
    headline: 'আপনার ট্রায়াল আজ শেষ হচ্ছে',
    subline: `${status.hoursLeft} ঘণ্টা বাকি — এর পর অটো ফ্রি টায়ারে চলে যাবেন।`,
    cta: 'আগেই সাবস্ক্রাইব করুন — ৫০% ছাড়',
    tone: 'urgent',
  }
}

export default function TrialBanner() {
  const [status, setStatus] = useState<TrialStatus | null>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    let abort = false
    fetch('/api/trial/status', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (abort) return
        if (data && data.exists) setStatus(data)
        setShown(true)
      })
      .catch(() => setShown(true))
    return () => {
      abort = true
    }
  }, [])

  if (!shown || !status || status.status === 'missing') return null

  const { headline, subline, cta, tone } = bannerCopy(status)

  const styles =
    tone === 'live' ?
      'bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 text-blue-900'
    : tone === 'urgent' ?
      'bg-gradient-to-r from-orange-50 to-red-50 border-b border-orange-300 text-orange-900'
    : tone === 'expired' ?
      'bg-gradient-to-r from-red-50 to-pink-50 border-b border-red-300 text-red-900'
    : tone === 'converted' ?
      'bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200 text-green-900'
    :
      'bg-gray-50 border-b border-gray-200 text-gray-900'
  const ctaCls =
    tone === 'live'  ? 'bg-blue-600 hover:bg-blue-700 text-white'
    : tone === 'urgent' ? 'bg-orange-600 hover:bg-orange-700 text-white'
    : tone === 'expired' ? 'bg-red-600 hover:bg-red-700 text-white'
    : tone === 'converted' ? 'bg-green-600 hover:bg-green-700 text-white'
    : 'bg-gray-600 hover:bg-gray-700 text-white'

  return (
    <div className={styles}>
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="font-semibold">{headline}</div>
          {subline && <div className="text-sm opacity-80 mt-0.5">{subline}</div>}
        </div>
        {cta && (
          <Link
            href="/dashboard/payment?ref=trial-banner"
            className={ctaCls + ' px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-colors'}
          >
            {cta}
          </Link>
        )}
      </div>
    </div>
  )
}
