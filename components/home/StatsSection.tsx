'use client'

import { useLocale } from '@/lib/locale-context'

export default function StatsSection() {
  const { t } = useLocale()
  return (
    <section className="bg-white dark:bg-slate-900 py-16 border-y border-gray-200 dark:border-slate-700">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {/* 2026-09-14 honesty pass: only verifiable facts — 6 products
            (lib/products.ts), 100 templates (lib/video-templates.ts), 100+
            services (serviceCatalog DB), BETA status. No invented user counts. */}
        <div>
          <div className="text-4xl font-bold text-[#0E7C3A] mb-2">৬</div>
          <div className="text-gray-600 dark:text-gray-400">{t('stats.activeCreators')}</div>
        </div>
        <div>
          <div className="text-4xl font-bold text-[#0E7C3A] mb-2">১০০+</div>
          <div className="text-gray-600 dark:text-gray-400">{t('stats.videosCreated')}</div>
        </div>
        <div>
          <div className="text-4xl font-bold text-[#0E7C3A] mb-2">১০০+</div>
          <div className="text-gray-600 dark:text-gray-400">{t('stats.templates')}</div>
        </div>
        <div>
          <div className="text-4xl font-bold text-[#0E7C3A] mb-2">BETA</div>
          <div className="text-gray-600 dark:text-gray-400">{t('stats.satisfaction')}</div>
        </div>
      </div>
    </section>
  )
}
