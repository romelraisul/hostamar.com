'use client'

import { useLocale } from '@/lib/locale-context'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function Navbar() {
  const { t, isRTL } = useLocale()

  return (
    <nav className={`bg-white/80 backdrop-blur-sm border-b border-gray-200 dark:bg-slate-900/90 dark:border-slate-700 ${isRTL ? 'text-right' : ''}`}>
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">H</span>
          </div>
          <span className="text-xl font-bold text-gray-900 dark:text-white">Hostamar</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="#pricing" className="text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400">{t('nav.pricing')}</a>
          <a href="#features" className="text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400">{t('nav.features')}</a>
          <LanguageSwitcher />
          <a href="/login" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            {t('nav.startFree')}
          </a>
        </div>
      </div>
    </nav>
  )
}
