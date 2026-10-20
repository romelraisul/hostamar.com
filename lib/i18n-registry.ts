import type { Locale } from './i18n'
// Sync bridge so locale-context's t() works without statically importing the
// big dictionary. i18n-dict registers itself on module load.
export const i18nState: { t: ((key: string, lang: Locale) => string) | null } = { t: null }
