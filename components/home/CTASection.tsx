'use client'

import { useLocale } from '@/lib/locale-context'

export default function CTASection() {
  const { t } = useLocale()
  return (
    <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-800 dark:to-purple-900">
      <div className="max-w-4xl mx-auto px-4 text-center text-white">
        <h2 className="text-4xl font-bold mb-6">{t('cta.createTitle')}</h2>
        <p className="text-xl mb-8 opacity-90">
          {t('cta.createSubtitle')}
        </p>
        <div className="flex gap-4 justify-center">
          <a href="/login" className="px-8 py-4 bg-white text-blue-600 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all">
            {t('cta.startFreeTrial')}
          </a>
          <a href="#pricing" className="px-8 py-4 border-2 border-white text-white rounded-xl font-bold text-lg hover:bg-white/10 transition-all">
            {t('cta.viewPlans')}
          </a>
        </div>
      </div>
    </section>
  )
}
