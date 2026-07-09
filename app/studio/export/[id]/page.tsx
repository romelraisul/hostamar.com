'use client'

import { useState } from 'react'
import Link from 'next/link'

// /studio/export/[id] — post-export page. This is where the cross-sell
// happens: "Host this video" (→ /hosting, sells hosting) and
// "Share to Facebook" (social auto-post). Both keep the user inside the
// Hostamar universe instead of bouncing to a third party.

export default function ExportPage() {
  const [hosted, setHosted] = useState(false)
  const [shared, setShared] = useState(false)

  return (
    <div className="mx-auto max-w-[760px] px-5 py-16 text-center">
      <div className="mx-auto aspect-video w-full max-w-[420px] rounded-2xl bg-[#111827] ring-1 ring-white/10">
        <div className="flex h-full items-center justify-center">
          <span className="rounded bg-[#0E7C3A]/90 px-3 py-1 text-sm font-bold text-white">
            ঈদের স্পেশাল অফার - ৪০% ছাড়
          </span>
        </div>
      </div>

      <h1 className="mt-6 font-hind text-2xl font-bold">আপনার ভিডিও রেডি!</h1>
      <p className="mt-2 text-zinc-500">এখন হোস্ট করুন অথবা সোশালে শেয়ার করুন।</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {/* Host this video — upsell to /hosting */}
        <div className="rounded-2xl border border-[#0E7C3A]/30 bg-[#0E7C3A]/5 p-5 text-left">
          <h2 className="font-hind text-lg font-bold text-[#0E7C3A]">এই ভিডিও হোস্ট করুন</h2>
          <p className="mt-1 text-sm text-zinc-600">
            এক ক্লিকে Hostamar-এ হোস্ট করুন — ৫GB ফ্রি, bKash পেমেন্ট, ঢাকা CDN।
          </p>
          <Link
            href="/hosting"
            className="mt-4 block rounded-full bg-[#0E7C3A] px-5 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-[#0A5A2B]"
          >
            {hosted ? '✓ হোস্ট করা হয়েছে' : 'Host this video'}
          </Link>
        </div>

        {/* Share to Facebook */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-left">
          <h2 className="font-hind text-lg font-bold">ফেসবুকে শেয়ার করুন</h2>
          <p className="mt-1 text-sm text-zinc-600">
            সরাসরি পেজ/গ্রুপে অটো-পোস্ট — ক্যাপশন + হ্যাশট্যাগ সহ।
          </p>
          <button
            type="button"
            onClick={() => setShared(true)}
            className="mt-4 block w-full rounded-full border border-zinc-300 px-5 py-2.5 text-center text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
          >
            {shared ? '✓ শেয়ার করা হয়েছে' : 'Share to Facebook'}
          </button>
        </div>
      </div>

      <div className="mt-8">
        <Link href="/studio" className="text-sm text-zinc-500 underline">
          ← স্টুডিওতে ফিরে যান
        </Link>
      </div>
    </div>
  )
}
