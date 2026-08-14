'use client'

import { useLocale } from '@/lib/locale-context'
import { locales, localeNames, type Locale } from '@/lib/i18n'
import { Globe, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white hover:bg-white/20 transition-colors"
        aria-label="Select language"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Globe className="w-4 h-4" />
        <span className="font-medium">{localeNames[locale]}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          className="absolute right-0 top-full mt-1 w-40 bg-white/95 backdrop-blur-sm border border-white/20 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in-0 zoom-in-95"
          role="listbox"
          aria-label="Available languages"
        >
          {locales.map((loc) => (
            <li key={loc} role="option" aria-selected={locale === loc}>
              <button
                onClick={() => { setLocale(loc); setOpen(false) }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  locale === loc
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="font-medium">{localeNames[loc]}</span>
                {locale === loc && (
                  <span className="ml-auto text-blue-600">���</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}