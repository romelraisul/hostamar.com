'use client'

import Link from 'next/link'
import { useLocale } from '@/lib/locale-context'
import { PRODUCT_NAV } from '@/lib/products'
import { NAV_LINKS } from './AppHeader'

const GREEN = '#0E7C3A'

// Mobile navigation drawer. Rendered by AppHeader; controlled via open/onClose.
export default function AppMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { locale, setLocale } = useLocale()
  const isBn = locale === 'bn'

  if (!open) return null

  return (
    <div className="md:hidden">
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden="true" />
      {/* Drawer */}
      <div className="fixed inset-x-0 top-16 z-50 max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-zinc-200 bg-white px-5 py-4">
        <div className="pb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          {isBn ? 'পণ্যসমূহ' : 'Products'}
        </div>
        {PRODUCT_NAV.map((p) => (
          <Link
            key={p.slug}
            href={p.route}
            onClick={onClose}
            className="flex items-center gap-2 py-2 font-medium text-zinc-800"
          >
            <span>{p.emoji}</span> {isBn ? p.nameBn : p.nameEn}
          </Link>
        ))}

        <div className="mt-2 border-t border-zinc-100 pt-2">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={onClose}
              className="block py-2 font-medium text-zinc-800"
            >
              {isBn ? l.labelBn : l.labelEn}
            </Link>
          ))}
        </div>

        <div className="mt-2 flex items-center gap-3 border-t border-zinc-100 pt-3">
          <button
            onClick={() => setLocale(isBn ? 'en' : 'bn')}
            className="rounded-full border border-zinc-200 px-3 py-1.5 text-[13px] font-medium text-zinc-700"
          >
            {isBn ? 'English' : 'বাংলা'}
          </button>
          <Link
            href="/login"
            onClick={onClose}
            className="rounded-full border border-zinc-200 px-3 py-1.5 text-[13px] font-medium text-zinc-700"
          >
            {isBn ? 'লগইন' : 'Login'}
          </Link>
        </div>

        <Link
          href="/signup"
          onClick={onClose}
          className="mt-3 flex h-11 w-full items-center justify-center rounded-full font-semibold text-white"
          style={{ background: GREEN }}
        >
          {isBn ? 'ফ্রি শুরু করুন' : 'Start Free'}
        </Link>
      </div>
    </div>
  )
}
