'use client'

import Link from 'next/link'
import { useLocale } from '@/lib/locale-context'

export default function Navbar() {
  const { locale } = useLocale()
  const isBengali = locale === 'bn'

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-100 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-5">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0E7C3A] font-bold text-white">
              H
            </span>
            <span className="text-[18px] font-bold tracking-tight text-[#18181B]">Hostamar</span>
            <span className="ml-1 rounded-full border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium">
              BETA
            </span>
          </Link>
          <div className="hidden items-center gap-7 text-[14px] font-medium text-zinc-600 md:flex">
            <Link href="/prompts" className="bangla transition hover:text-[#18181B]">
              {isBengali ? 'টেমপ্লেট' : 'Templates'}
            </Link>
            <Link href="/pricing" className="transition hover:text-[#18181B]">
              {isBengali ? 'প্রাইসিং' : 'Pricing'}
            </Link>
            <Link href="/products" className="transition hover:text-[#18181B]">
              {isBengali ? 'Labs' : 'Labs'}
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden text-[14px] font-medium text-zinc-600 hover:text-[#18181B] md:block"
          >
            {isBengali ? 'লগইন' : 'Login'}
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-9 items-center justify-center rounded-full bg-[#0E7C3A] px-4 text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(14,124,58,0.5)] transition hover:bg-[#0A5A2B]"
          >
            {isBengali ? 'ফ্রি শুরু করুন' : 'Start free'}
          </Link>
        </div>
      </div>
    </nav>
  )
}
