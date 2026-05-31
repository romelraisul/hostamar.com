'use client'

import { useLocale } from '@/lib/locale-context'

export default function StatsSection() {
  const { t } = useLocale()
  return (
    <section className="bg-white dark:bg-slate-900 py-16 border-y border-gray-200 dark:border-slate-700">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        <div>
          <div className="text-4xl font-bold text-blue-600 mb-2">500+</div>
          <div className="text-gray-600 dark:text-gray-400">{t('stats.activeCreators')}</div>
        </div>
        <div>
          <div className="text-4xl font-bold text-blue-600 mb-2">10K+</div>
          <div className="text-gray-600 dark:text-gray-400">{t('stats.videosCreated')}</div>
        </div>
        <div>
          <div className="text-4xl font-bold text-blue-600 mb-2">50+</div>
          <div className="text-gray-600 dark:text-gray-400">{t('stats.templates')}</div>
        </div>
        <div>
          <div className="text-4xl font-bold text-blue-600 mb-2">99%</div>
          <div className="text-gray-600 dark:text-gray-400">{t('stats.satisfaction')}</div>
        </div>
      </div>
    </section>
  )
}
