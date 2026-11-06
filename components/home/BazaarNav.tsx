'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLocale } from '@/lib/locale-context'
import { PRODUCT_NAV } from '@/lib/products'

const GREEN = '#0E7C3A'

export const BAZAAR_NAV_LINKS: { href: string; labelBn: string; labelEn: string; badge?: 'NEW' }[] = [
  { href: '/tv', labelBn: '📺 লাইভ TV', labelEn: '📺 Live TV' },
  { href: '/store', labelBn: 'AI Store', labelEn: 'AI Store' },
  { href: '/bangla-llm', labelBn: 'বাংলা LLM', labelEn: 'Bangla LLM', badge: 'NEW' },
  { href: '/docs', labelBn: 'ডকস', labelEn: 'Docs' },
  { href: '/pricing', labelBn: 'প্রাইসিং', labelEn: 'Pricing' },
  { href: '/features', labelBn: 'ফিচার', labelEn: 'Features' },
  { href: '/labs', labelBn: 'Labs', labelEn: 'Labs' },
  { href: '/blog', labelBn: 'ব্লগ', labelEn: 'Blog' },
]

export default function BazaarNav() {
  const { locale, setLocale } = useLocale()
  const pathname = usePathname() || '/'
  const isBn = locale === 'bn'
  const [prodOpen, setProdOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setProdOpen(false)
    setMobileOpen(false)
  }, [pathname])

  const isActive = (href: string) => {
    const base = href.split('#')[0]
    if (base === '/') return pathname === '/'
    return pathname === base || pathname.startsWith(base + '/')
  }

  return (
    <header className={`sticky top-0 z-50 transition-all duration-200 ${scrolled ? 'bg-white/95 backdrop-blur-xl shadow-md border-b border-zinc-200' : 'bg-white border-b border-zinc-200'}`}>
      <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-4 sm:px-6">
        {/* Left: logo + desktop nav */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Hostamar home">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[16px] font-bold text-white"
              style={{ background: GREEN }}
            >
              H
            </div>
            <span className="text-[18px] font-bold tracking-tight text-zinc-900">Hostamar</span>
            <span className="ml-1 rounded-full border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium">
              BETA
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-[14px] font-medium text-zinc-600 md:flex">
            {/* Products mega-menu */}
            <div
              className="relative"
              onMouseEnter={() => setProdOpen(true)}
              onMouseLeave={() => setProdOpen(false)}
            >
              <button
                className="inline-flex items-center gap-1 transition hover:text-zinc-900"
                aria-expanded={prodOpen}
              >
                {isBn ? 'পণ্যসমূহ' : 'Products'}
                <span className={`text-[10px] transition ${prodOpen ? 'rotate-180' : ''}`}>▾</span>
              </button>
              {prodOpen && (
                <div className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3">
                  <div className="grid w-[460px] grid-cols-2 gap-1 rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl">
                    {PRODUCT_NAV.map((p) => (
                      <Link
                        key={p.slug}
                        href={p.route}
                        className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition hover:bg-zinc-50"
                      >
                        <span className="mt-0.5 text-[20px] leading-none">{p.emoji}</span>
                        <span>
                          <span className="block text-[14px] font-semibold text-zinc-900">
                            {isBn ? p.nameBn : p.nameEn}
                          </span>
                          <span className="block text-[12px] text-zinc-500">{p.taglineBn}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {BAZAAR_NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`transition hover:text-zinc-900 ${isActive(l.href) ? 'text-zinc-900' : ''}`}
              >
                {isBn ? l.labelBn : l.labelEn}
                {l.badge && (
                  <span
                    className="ml-1 inline-flex animate-pulse items-center rounded-full px-1.5 py-0.5 align-middle text-[9px] font-bold text-white"
                    style={{ background: GREEN }}
                  >
                    NEW
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: lang switch + CTA + user + mobile toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocale(isBn ? 'en' : 'bn')}
            className="hidden items-center gap-1 rounded-full border border-zinc-200 px-2.5 py-1 text-[12px] font-medium text-zinc-600 transition hover:text-zinc-900 md:inline-flex"
            aria-label="Toggle language"
          >
            {isBn ? 'EN' : 'বাং'}
          </button>
          <Link
            href="/login"
            className="hidden text-[14px] font-medium text-zinc-600 hover:text-zinc-900 md:block"
          >
            {isBn ? 'লগইন' : 'Login'}
          </Link>
          <Link
            href="/signup"
            className="hidden h-9 items-center justify-center rounded-full px-4 text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(14,124,58,0.5)] transition hover:brightness-105 md:inline-flex"
            style={{ background: GREEN }}
          >
            {isBn ? 'ফ্রি শুরু করুন' : 'Start Free'}
          </Link>
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 md:hidden"
            aria-label="Open menu"
          >
            ☰
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <details className={mobileOpen ? 'open' : ''} style={{ display: mobileOpen ? 'block' : 'none' }}>
        <summary aria-label="Open menu" className="hidden md:hidden" />
        <nav className="fixed inset-0 z-50 bg-white md:hidden" style={{ height: '100dvh' }}>
          <div className="flex h-full flex-col px-6 py-8">
            <div className="flex items-center justify-between mb-8">
              <Link href="/" className="flex items-center gap-2.5" aria-label="Hostamar home">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[16px] font-bold text-white"
                  style={{ background: GREEN }}
                >
                  H
                </div>
                <span className="text-[18px] font-bold tracking-tight text-zinc-900">Hostamar</span>
                <span className="ml-1 rounded-full border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium">
                  BETA
                </span>
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1">
              {/* Products mega-menu in mobile */}
              <details className="group">
                <summary className="flex items-center justify-between py-3 text-[16px] font-medium text-zinc-900">
                  {isBn ? 'পণ্যসমূহ' : 'Products'}
                  <span className="text-[14px] transition group-open:rotate-180">▾</span>
                </summary>
                <div className="grid grid-cols-2 gap-2 py-2 border-t border-zinc-100">
                  {PRODUCT_NAV.map((p) => (
                    <Link
                      key={p.slug}
                      href={p.route}
                      className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition hover:bg-zinc-50"
                      onClick={() => setMobileOpen(false)}
                    >
                      <span className="mt-0.5 text-[20px] leading-none">{p.emoji}</span>
                      <span>
                        <span className="block text-[14px] font-semibold text-zinc-900">
                          {isBn ? p.nameBn : p.nameEn}
                        </span>
                        <span className="block text-[12px] text-zinc-500">{p.taglineBn}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </details>

              {BAZAAR_NAV_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`flex items-center gap-2 py-3 px-1 transition hover:bg-zinc-50 rounded-lg ${isActive(l.href) ? 'bg-zinc-50 text-zinc-900' : 'text-zinc-600'}`}
                  onClick={() => setMobileOpen(false)}
                >
                  {isBn ? l.labelBn : l.labelEn}
                  {l.badge && (
                    <span
                      className="ml-auto inline-flex animate-pulse items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white"
                      style={{ background: GREEN }}
                    >
                      NEW
                    </span>
                  )}
                </Link>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3 pt-6 border-t border-zinc-200">
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setLocale(isBn ? 'en' : 'bn')}
                  className="flex-1 items-center justify-center gap-1 rounded-full border border-zinc-200 px-4 py-2 text-[13px] font-medium text-zinc-600 transition hover:text-zinc-900"
                  aria-label="Toggle language"
                >
                  {isBn ? 'EN' : 'বাং'}
                </button>
              </div>
              <Link
                href="/login"
                className="text-center text-[14px] font-medium text-zinc-600 hover:text-zinc-900 py-2"
                onClick={() => setMobileOpen(false)}
              >
                {isBn ? 'লগইন' : 'Login'}
              </Link>
              <Link
                href="/signup"
                className="text-center h-10 items-center justify-center rounded-full px-4 text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(14,124,58,0.5)] transition hover:brightness-105"
                style={{ background: GREEN }}
                onClick={() => setMobileOpen(false)}
              >
                {isBn ? 'ফ্রি শুরু করুন' : 'Start Free'}
              </Link>
            </div>
          </div>
        </nav>
      </details>
    </header>
  )
}