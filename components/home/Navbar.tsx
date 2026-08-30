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
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563EB] font-bold text-white">
              H
            </span>
            <span className="text-[18px] font-bold tracking-tight text-[#18181B]">Hostamar</span>
            <span className="ml-1 rounded-full border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium">
              BETA
            </span>
          </Link>
          <div className="hidden items-center gap-7 text-[14px] font-medium text-zinc-600 md:flex">
            <Link href="/docs" className="bangla transition font-medium hover:text-[#0E7C3A]">
              {isBengali ? 'ডকস' : 'Docs'}
            </Link>
            <Link href="/prompts" className="bangla transition hover:text-[#18181B]">
              {isBengali ? 'টেমপ্লেট' : 'Templates'}
            </Link>
            <Link href="/pricing" className="transition hover:text-[#18181B]">
              {isBengali ? 'প্রাইসিং' : 'Pricing'}
            </Link>
            <div className="group relative">
              <button
                type="button"
                className="flex items-center gap-1 transition hover:text-[#18181B]"
                aria-haspopup="true"
              >
                {isBengali ? 'পণ্যসমূহ' : 'Products'}
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="invisible absolute left-1/2 top-full z-50 w-60 -translate-x-1/2 pt-3 opacity-0 transition group-hover:visible group-hover:opacity-100">
                <div className="rounded-2xl border border-zinc-100 bg-white p-2 shadow-xl">
                  <a href="/hosting" className="block rounded-lg px-3 py-2 text-sm hover:bg-zinc-100">
                    {isBengali ? 'ক্লাউড হোস্টিং' : 'Cloud Hosting'}
                  </a>
                  <a href="/ai-chat" className="block rounded-lg px-3 py-2 text-sm hover:bg-zinc-100">
                    {isBengali ? 'AI চ্যাট' : 'AI Chat'}
                  </a>
                  {/* Browser + Game hidden — 70/20/10: keep only Video/Hosting/Tools */}
                  <a href="/dev" className="block rounded-lg px-3 py-2 text-sm hover:bg-zinc-100">
                    {isBengali ? 'Dev IDE' : 'Dev IDE'}
                  </a>
                  <a href="/roadmap" className="block rounded-lg px-3 py-2 text-sm text-[#2563EB] hover:bg-zinc-100">
                    {isBengali ? 'রোডম্যাপ →' : 'Roadmap →'}
                  </a>
                </div>
              </div>
            </div>
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
            className="inline-flex h-9 items-center justify-center rounded-full bg-[#2563EB] px-4 text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(37,99,235,0.5)] transition hover:bg-[#1D4ED8]"
          >
            {isBengali ? 'ফ্রি শুরু করুন' : 'Start free'}
          </Link>
        </div>
      </div>
    </nav>
  )
}
