'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { translations, getLocaleFromCookie, type Locale } from '@/lib/i18n'

type LocaleContextType = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
}

// Single source of truth: the full dictionary lives in lib/i18n.ts (567 keys x 3 langs).
// This context only reads from it — no duplicated dictionary to drift out of sync,
// which previously caused raw keys (nav.videos, dashboard.title) to render in the UI.
const LocaleContext = createContext<LocaleContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key,
})

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  // Initialize from the locale cookie if present (e.g. on client-side navigation).
  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    if (typeof document !== 'undefined') {
      document.cookie = `locale=${newLocale};path=/;max-age=31536000`
    }
  }, [])

  // On client mount, respect an existing locale cookie (persisted after toggling).
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const saved = getLocaleFromCookie(document.cookie)
      setLocaleState(saved)
    }
  }, [])

  const t = useCallback((key: string): string => {
    return translations[locale]?.[key] || translations['en']?.[key] || key
  }, [locale])

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  return useContext(LocaleContext)
}

export default LocaleContext