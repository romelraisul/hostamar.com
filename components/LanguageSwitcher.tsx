'use client'

import { useState, useEffect } from 'react'
import type { Locale } from '@/lib/i18n'

function getCookieLocale(): Locale {
  if (typeof document === 'undefined') return 'en'
  const match = document.cookie.match(/locale=([^;]+)/)
  return (match?.[1] as Locale) || 'en'
}

export default function LanguageSwitcher() {
  const [locale, setLocale] = useState<Locale>('en')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setLocale(getCookieLocale())
    setMounted(true)
  }, [])

  const toggleLocale = () => {
    const next = locale === 'en' ? 'bn' : 'en'
    document.cookie = `locale=${next}; path=/; max-age=31536000`
    setLocale(next)
    window.location.reload()
  }

  if (!mounted) return null

  return (
    <button
      onClick={toggleLocale}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
      aria-label={`Switch to ${locale === 'en' ? 'Bengali' : 'English'}`}
      title={`Switch to ${locale === 'en' ? 'বাংলা' : 'English'}`}
    >
      <span className="text-sm">🌐</span>
      <span className="font-medium">
        {locale === 'en' ? 'EN' : 'বাং'}
      </span>
    </button>
  )
}
