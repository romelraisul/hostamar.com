'use client'

import { createContext, useContext, useCallback, useMemo } from 'react'
import type { Locale } from '@/lib/i18n'
import { t as i18nT, locales } from '@/lib/i18n'

type LocaleContextType = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
  dir: 'ltr' | 'rtl'
  isRTL: boolean
}

const LocaleContext = createContext<LocaleContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (key: string) => key,
  dir: 'ltr',
  isRTL: false,
})

export function useLocale() {
  return useContext(LocaleContext)
}

export function LocaleProvider({
  locale: initialLocale,
  children,
}: {
  locale: Locale
  children: React.ReactNode
}) {
  const locale = initialLocale || 'en'
  const isRTL = locale === 'ur'
  const dir = isRTL ? 'rtl' as const : 'ltr' as const

  const setLocale = useCallback((newLocale: Locale) => {
    if (typeof document !== 'undefined') {
      document.cookie = `locale=${newLocale};path=/;max-age=31536000`
      document.documentElement.lang = newLocale
      document.documentElement.dir = newLocale === 'ur' ? 'rtl' : 'ltr'
      window.location.reload()
    }
  }, [])

  const t = useCallback(
    (key: string): string => i18nT(key, locale),
    [locale]
  )

  const value = useMemo(
    () => ({ locale, setLocale, t, dir, isRTL }),
    [locale, setLocale, t, dir, isRTL]
  )

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  )
}
