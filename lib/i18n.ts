export type Locale = 'en' | 'bn' | 'ur'

export const locales: Locale[] = ['en', 'bn', 'ur']
export const defaultLocale: Locale = 'bn'

export const localeNames: Record<Locale, string> = {
  en: 'English',
  bn: 'বাংলা',
  ur: 'اردو',
}

// The ~150KB translation dictionary lives in ./i18n-dict (lazy). Client
// components that render t() import '@/lib/i18n-dict' alongside useLocale, so
// the dictionary ships only in chunks that actually translate text — it used
// to be eagerly downloaded on every page (chunk 4600, ~39KB gz) via
// locale-context. Server components may keep importing t() from here.
export { t, getLocaleFromCookie, getLocaleFromHeader } from './i18n-dict'
