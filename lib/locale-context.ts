'use client'

import { createContext, useContext } from 'react'

type LocaleContextType = {
  locale: string
  t: (key: string) => string
}

const LocaleContext = createContext<LocaleContextType>({
  locale: 'en',
  t: (key: string) => key,
})

export function useLocale() {
  return useContext(LocaleContext)
}

export default LocaleContext
