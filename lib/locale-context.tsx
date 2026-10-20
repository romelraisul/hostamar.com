'use client'

import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import type { Locale } from '@/lib/i18n'
import { i18nState } from '@/lib/i18n-registry'

type LocaleContextType = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
  dir: 'ltr' | 'rtl'
  isRTL: boolean
}

const LocaleContext = createContext<LocaleContextType>({
  locale: 'bn',
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
  const locale = (initialLocale || 'bn') as Locale
  const isRTL = false // bn is LTR, no RTL locales currently
  const dir = 'ltr' as const

  const setLocale = useCallback((newLocale: Locale) => {
    if (typeof document !== 'undefined') {
      document.cookie = `locale=${newLocale};path=/;max-age=31536000`
      document.documentElement.lang = newLocale
      document.documentElement.dir = 'ltr'
      window.location.reload()
    }
  }, [])

  // Safety net: routes whose chunks don't statically import the dictionary
  // still get real strings shortly after mount (any t() called before then
  // renders the key and self-heals on this state flip).
  const [dictReady, setDictReady] = useState(false)
  useEffect(() => {
    if (!i18nState.t) {
      import('@/lib/i18n-dict').then(() => setDictReady(true))
    }
  }, [])

  const t = useCallback(
    (key: string): string => (i18nState.t ? i18nState.t(key, locale) : key),
    // dictReady: re-create t (and re-render consumers) once the dictionary
    // lands so pre-load key fallbacks self-heal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale, dictReady]
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
