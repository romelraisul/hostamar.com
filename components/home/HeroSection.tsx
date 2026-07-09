'use client'

import { useLocale } from '@/lib/locale-context'
import { useEffect, useState } from 'react'
import Link from 'next/link'

// Hero typing lines (rotating) — plain React, zero-dep.
const TYPING_LINES_BN = [
  'স্ক্রিপ্ট বাংলায় লিখুন',
  'ভয়েস অটো বাংলা',
  'ক্যাপশন অটো',
]
const TYPING_LINES_EN = [
  'script in Bangla',
  'voiceover auto',
  'captions auto',
]

export default function HeroSection() {
  const { locale } = useLocale()
  const isBengali = locale === 'bn'
  const lines = isBengali ? TYPING_LINES_BN : TYPING_LINES_EN

  const [idx, setIdx] = useState(0)
  const [text, setText] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const cur = lines[idx % lines.length]
    let timer: ReturnType<typeof setTimeout>
    if (!deleting && text === cur) {
      timer = setTimeout(() => setDeleting(true), 1400)
    } else if (deleting && text === '') {
      setDeleting(false)
      setIdx((i) => (i + 1) % lines.length)
    } else {
      timer = setTimeout(() => {
        setText(cur.slice(0, deleting ? text.length - 1 : text.length + 1))
      }, deleting ? 45 : 90)
    }
    return () => timer && clearTimeout(timer)
  }, [text, deleting, idx, lines])

  return (
    <section className="relative overflow-hidden bg-[#FCFCF9]">
      <div className="mx-auto grid max-w-[1120px] items-center gap-10 px-5 py-16 lg:grid-cols-2 lg:py-24">
        {/* Left: copy */}
        <div>
          <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#0E7C3A]/10 px-3 py-1 text-xs font-semibold text-[#0E7C3A]">
            {isBengali ? 'বাংলাদেশি SME দের জন্য' : 'For Bangladeshi SMEs'}
          </span>
          <h1 className="font-hind text-4xl font-bold leading-tight tracking-tight text-[#18181B] lg:text-5xl">
            {isBengali ? 'বাংলাদেশি ব্যবসার জন্য AI ভিডিও,' : 'AI video for Bangladeshi business,'}
            <br />
            <span className="text-[#0E7C3A]">{isBengali ? '৩০ সেকেন্ডে রেডি' : 'ready in 30 seconds'}</span>
          </h1>
          <p className="mt-4 text-lg text-zinc-600">
            {isBengali ? 'বাংলায় ' : 'Write in Bangla — '}
            <span className="inline-block min-h-[1.5em] font-semibold text-[#18181B]">
              {text}
              <span className="ml-0.5 inline-block w-[2px] animate-pulse bg-[#0E7C3A]">&nbsp;</span>
            </span>
          </p>
          <p className="mt-2 text-base text-zinc-500">
            {isBengali
              ? 'ঈদ, পহেলা বৈশাখ, ১১.১১ — ৫০+ টেমপ্লেট দিয়ে ভাইরাল ভিডিও বানান। bKash দিয়ে পেমেন্ট, শুরু ৳0 থেকে।'
              : 'Eid, Pohela Boishakh, 11.11 — 50+ templates for viral videos. Pay with bKash, start from ৳0.'}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#0E7C3A] px-7 text-base font-semibold text-white shadow-[0_8px_20px_-8px_rgba(14,124,58,0.6)] transition hover:bg-[#0A5A2B]"
            >
              {isBengali ? 'ফ্রি শুরু করুন' : 'Start free'}
            </Link>
            <Link
              href="/prompts"
              className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-300 px-7 text-base font-semibold text-[#18181B] transition hover:bg-zinc-100"
            >
              {isBengali ? 'টেমপ্লেট দেখুন' : 'See templates'}
            </Link>
          </div>

          {/* trust badges — real payment names, no broken icons */}
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-zinc-500">
            <span className="text-[#0E7C3A]">bKash</span>
            <span className="text-[#E4312B]">Nagad</span>
            <span className="text-[#7B2FF7]">Rocket</span>
            <span className="text-zinc-400">·</span>
            <span>৳0 থেকে শুরু</span>
          </div>
        </div>

        {/* Right: studio UI mock showing Select → Customize → Export */}
        <div className="relative">
          <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl">
            <div className="mb-3 flex items-center gap-1.5 px-1">
              <span className="h-3 w-3 rounded-full bg-[#FF5F56]" />
              <span className="h-3 w-3 rounded-full bg-[#FFBD2E]" />
              <span className="h-3 w-3 rounded-full bg-[#27C93F]" />
              <span className="ml-2 text-xs text-zinc-400">studio.hostamar.com</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['টেমপ্লেট', 'কাস্টমাইজ', 'এক্সপোর্ট'].map((step, i) => (
                <div key={step} className="rounded-xl border border-zinc-200 bg-[#FCFCF9] p-3 text-center">
                  <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-[#0E7C3A]/10 text-sm font-bold text-[#0E7C3A]">
                    {i + 1}
                  </div>
                  <div className="text-xs font-semibold text-[#18181B]">
                    {isBengali ? step : ['Template', 'Customize', 'Export'][i]}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex aspect-video items-center justify-center rounded-xl bg-gradient-to-br from-[#0E7C3A]/10 to-[#E4312B]/10">
              <span className="text-sm font-medium text-zinc-500">
                {isBengali ? 'ভিডিও প্রিভিউ' : 'Video preview'}
              </span>
            </div>
          </div>
          <div className="absolute -right-3 -top-3 rounded-full bg-[#E4312B] px-3 py-1 text-xs font-bold text-white shadow-lg">
            30s ⚡
          </div>
        </div>
      </div>
    </section>
  )
}
