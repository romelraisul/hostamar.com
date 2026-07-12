'use client'

import Link from 'next/link'
import { useLocale } from '@/lib/locale-context'
import { PRODUCT_NAV } from '@/lib/products'

const GREEN = '#0E7C3A'

const COMPANY_LINKS = [
  { href: '/about', bn: 'আমাদের সম্পর্কে', en: 'About' },
  { href: '/blog', bn: 'ব্লগ', en: 'Blog' },
  { href: '/careers', bn: 'ক্যারিয়ার', en: 'Careers' },
  { href: '/contact', bn: 'যোগাযোগ', en: 'Contact' },
]

const LEGAL_LINKS = [
  { href: '/terms', bn: 'শর্তাবলী', en: 'Terms' },
  { href: '/privacy', bn: 'প্রাইভেসি', en: 'Privacy' },
  { href: '/refund', bn: 'রিফান্ড', en: 'Refund' },
]

const PAYMENT_BADGES = ['bKash', 'Nagad', 'Rocket', 'Upay']

export default function AppFooter() {
  const { locale } = useLocale()
  const isBn = locale === 'bn'
  const year = new Date().getFullYear()

  return (
    <footer className="mt-20 border-t border-zinc-200 bg-white">
      <div className="mx-auto max-w-[1180px] px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Column 1: Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[16px] font-bold text-white"
                style={{ background: GREEN }}
              >
                H
              </div>
              <span className="text-[18px] font-bold text-zinc-900">Hostamar</span>
            </div>
            <p className="mt-3 max-w-[260px] text-[13px] leading-[1.6] text-zinc-500">
              বাংলাদেশি ব্যবসার জন্য AI মার্কেটিং ভিডিও মেকার। ঢাকা থেকে ❤️ দিয়ে তৈরি।
            </p>
            <div className="mt-4 flex gap-3 text-zinc-500">
              <a href="https://facebook.com/romelraisul" aria-label="Facebook" className="hover:text-zinc-900">
                Facebook
              </a>
              <a href="https://youtube.com/@hostamar" aria-label="YouTube" className="hover:text-zinc-900">
                YouTube
              </a>
            </div>
          </div>

          {/* Column 2: Products (all 6) */}
          <div>
            <div className="mb-3 text-[13px] font-semibold text-zinc-900">
              {isBn ? 'পণ্যসমূহ' : 'Products'}
            </div>
            <ul className="space-y-2.5 text-[13px] text-zinc-500">
              {PRODUCT_NAV.map((p) => (
                <li key={p.slug}>
                  <Link href={p.route} className="hover:text-zinc-900">
                    {isBn ? p.nameBn : p.nameEn}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Company */}
          <div>
            <div className="mb-3 text-[13px] font-semibold text-zinc-900">
              {isBn ? 'কোম্পানি' : 'Company'}
            </div>
            <ul className="space-y-2.5 text-[13px] text-zinc-500">
              {COMPANY_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-zinc-900">
                    {isBn ? l.bn : l.en}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Legal + Payment */}
          <div>
            <div className="mb-3 text-[13px] font-semibold text-zinc-900">
              {isBn ? 'লিগ্যাল ও পেমেন্ট' : 'Legal & Payment'}
            </div>
            <ul className="space-y-2.5 text-[13px] text-zinc-500">
              {LEGAL_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-zinc-900">
                    {isBn ? l.bn : l.en}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {PAYMENT_BADGES.map((b) => (
                <span
                  key={b}
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-700"
                >
                  {b}
                </span>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-zinc-500">
              <span className="rounded-full border border-zinc-200 px-2 py-0.5">🔒 SSL</span>
              <span className="rounded-full border border-zinc-200 px-2 py-0.5">
                {isBn ? '৭ দিনের মানি-ব্যাক' : '7-day money-back'}
              </span>
              <span className="rounded-full border border-zinc-200 px-2 py-0.5">
                {isBn ? 'ভ্যাট সহ' : 'VAT incl.'}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-zinc-100 pt-6 text-[12px] text-zinc-500 sm:flex-row">
          <span>© {year} Hostamar. All rights reserved.</span>
          <span className="flex items-center gap-1.5">
            Made for Bangladesh 🇧🇩
          </span>
        </div>
      </div>
    </footer>
  )
}
