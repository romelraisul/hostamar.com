'use client'

import { useLocale } from '@/lib/locale-context'
import { locales, localeNames } from '@/lib/i18n'

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale()

  const currentIndex = locales.indexOf(locale)
  const nextLocale = locales[(currentIndex + 1) % locales.length]

  return (
    <button
      onClick={() => setLocale(nextLocale)}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
      aria-label={`Switch language`}
      title={`${localeNames[locale]} → ${localeNames[nextLocale]}`}
    >
      <span className="text-sm">🌐</span>
      <span className="font-medium">
        {locale === 'en' ? 'EN' : locale === 'bn' ? 'বাং' : 'اردو'}
      </span>
    </button>
  )
}
