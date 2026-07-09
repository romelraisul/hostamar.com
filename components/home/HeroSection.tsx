'use client'
import { useLocale } from '@/lib/locale-context'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const EN_PHRASES = ['in 30 seconds', 'without a designer', 'in Bangla', 'for ৳0']
const BN_PHRASES = ['৩০ সেকেন্ডে', 'ডিজাইনার ছাড়াই', 'বাংলায়', '৳0 এ']

export default function HeroSection() {
  const { locale } = useLocale()
  const isBengali = locale === 'bn'
  const phrases = isBengali ? BN_PHRASES : EN_PHRASES

  const [idx, setIdx] = useState(0)
  const [text, setText] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const current = phrases[idx]
    const speed = deleting ? 45 : 90
    const timeout = setTimeout(() => {
      if (!deleting) {
        const next = current.slice(0, text.length + 1)
        setText(next)
        if (next === current) {
          setTimeout(() => setDeleting(true), 1300)
        }
      } else {
        const next = current.slice(0, text.length - 1)
        setText(next)
        if (next === '') {
          setDeleting(false)
          setIdx((i) => (i + 1) % phrases.length)
        }
      }
    }, speed)
    return () => clearTimeout(timeout)
  }, [text, deleting, idx, phrases])

  return (
    <>
      <section className="relative overflow-hidden bg-[#0a0a0a] text-white">
        {/* BD Trust gradient glows */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/20 via-transparent to-transparent" />
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-bd-red/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-18 lg:py-24">
          {/* Top badge */}
          <div className="mb-6 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              {isBengali ? 'হোস্টামার — বাংলাদেশি ব্যবসার জন্য একটি প্ল্যাটফর্ম' : 'Hostamar — One Platform for Bangladeshi Business'}
            </span>
          </div>

          <div className="grid gap-10 lg:grid-cols-12 lg:gap-12 items-center">
            {/* Left - Copy */}
            <div className="lg:col-span-7 text-center lg:text-left">
              <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                {isBengali ? 'আপনার পণ্য এখনই ভাইরাল ভিডিও' : 'Turn Your Product Into a Viral Video'}
                <br />
                <span className="bg-gradient-to-r from-emerald-400 to-emerald-200 bg-clip-text text-transparent">
                  {text}
                  <span className="ml-0.5 inline-block w-[2px] animate-pulse bg-emerald-400 align-middle" style={{ height: '0.9em' }} />
                </span>
              </h1>

              <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base lg:mx-0">
                {isBengali
                  ? 'AI মার্কেটিং ভিডিও, হোস্টিং আর আরও অনেক কিছু — এক একাউন্টেই। HostSeba/ExonHost শুধু হোস্টিং দেয়; আমরা দিই AI ভিডিও + হোস্টিং + bKash পেমেন্ট।'
                  : 'AI marketing video, hosting and more — all under one account. HostSeba/ExonHost only do hosting; we give you AI video + hosting + bKash payment.'}
              </p>

              {/* CTAs */}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Link
                  href="/create"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-8 text-sm font-bold text-black hover:bg-zinc-200 transition"
                >
                  {isBengali ? 'ফ্রিতে ভিডিও বানান — ৳0' : 'Create Free Video — ৳0'}
                </Link>
                <Link
                  href="/products"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 px-8 text-sm font-bold text-white hover:bg-zinc-800 transition"
                >
                  {isBengali ? 'সব পণ্য দেখুন' : 'Explore All Products'}
                </Link>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-zinc-500 lg:justify-start">
                <span className="flex items-center gap-1"><span className="text-emerald-400">✓</span> bKash</span>
                <span className="flex items-center gap-1"><span className="text-emerald-400">✓</span> Nagad</span>
                <span className="flex items-center gap-1"><span className="text-emerald-400">✓</span> Rocket</span>
                <span className="flex items-center gap-1"><span className="text-emerald-400">✓</span> ৳0 ফ্রি প্ল্যান</span>
                <span className="flex items-center gap-1"><span className="text-emerald-400">✓</span> BDIX ফাস্ট</span>
              </div>
            </div>

            {/* Right - Visual */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3 shadow-2xl lg:ml-auto">
                <div className="aspect-[9/16] overflow-hidden rounded-xl bg-black">
                  <div className="p-4">
                    <div className="mb-3 flex gap-2">
                      <div className="h-2 w-2 rounded-full bg-bd-red" />
                      <div className="h-2 w-2 rounded-full bg-yellow-500" />
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                    </div>
                    <div className="space-y-3">
                      <div className="h-8 rounded-lg bg-emerald-500/20" />
                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-20 rounded-lg bg-zinc-800" />
                        <div className="h-20 rounded-lg bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-500">
                          {isBengali ? 'ঈদ অফার' : 'Eid Offer'}
                        </div>
                      </div>
                      <div className="h-32 rounded-lg bg-gradient-to-br from-emerald-900/50 to-zinc-800 flex items-center justify-center">
                        <span className="text-xs text-emerald-300">AI Video Preview</span>
                      </div>
                      <div className="h-10 rounded-lg bg-white text-black flex items-center justify-center text-xs font-bold">
                        {isBengali ? 'এখনই জেনারেট করুন' : 'Generate Now'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute -right-3 -bottom-3 rounded-full bg-white px-3 py-1 text-xs font-bold text-black shadow-lg">
                  {isBengali ? '৳0 থেকে শুরু' : 'Start from ৳0'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
