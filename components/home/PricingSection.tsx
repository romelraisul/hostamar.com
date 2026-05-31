'use client'

import { useLocale } from '@/lib/locale-context'

export default function PricingSection() {
  const { t } = useLocale()
  return (
    <section id="pricing" className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          {t('pricing.title')}
        </h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {/* Free */}
          <div className="bg-white p-8 rounded-xl border text-center">
            <h3 className="text-xl font-bold mb-4">{t('pricing.freeTitle')}</h3>
            <div className="text-4xl font-bold text-gray-900 mb-4">৳0</div>
            <p className="text-gray-600 mb-6">{t('pricing.freeDesc')}</p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2 justify-center">
                <span className="text-green-500">✓</span>
                {t('pricing.freeVideos')}
              </li>
              <li className="flex items-center gap-2 justify-center">
                <span className="text-green-500">✓</span>
                {t('pricing.freeQuality')}
              </li>
              <li className="flex items-center gap-2 justify-center">
                <span className="text-green-500">✓</span>
                {t('pricing.freeTemplates')}
              </li>
            </ul>
            <a href="/login" className="block w-full py-3 rounded-lg border-2 border-gray-300 text-gray-700 hover:bg-gray-50">
              {t('pricing.freeCTA')}
            </a>
          </div>

          {/* Starter */}
          <div className="bg-white p-8 rounded-xl border-2 border-blue-500 shadow-lg relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-bold">
              {t('pricing.mostPopular')}
            </div>
            <h3 className="text-xl font-bold mb-4">{t('pricing.starter')}</h3>
            <div className="text-4xl font-bold text-blue-600 mb-4">৳2,000<span className="text-lg">{t('pricing.starterPeriodShort')}</span></div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2 justify-center">
                <span className="text-green-500">✓</span>
                {t('pricing.starterVideosCustom')}
              </li>
              <li className="flex items-center gap-2 justify-center">
                <span className="text-green-500">✓</span>
                {t('pricing.starterQuality')}
              </li>
              <li className="flex items-center gap-2 justify-center">
                <span className="text-green-500">✓</span>
                {t('pricing.starterTemplatesFull')}
              </li>
              <li className="flex items-center gap-2 justify-center">
                <span className="text-green-500">✓</span>
                {t('pricing.starterSupport')}
              </li>
            </ul>
            <a href="/login" className="block w-full py-3 rounded-lg bg-blue-600 text-white text-center hover:bg-blue-700">
              {t('pricing.starterChoosePlan')}
            </a>
          </div>

          {/* Business */}
          <div className="bg-white p-8 rounded-xl border text-center">
            <h3 className="text-xl font-bold mb-4">{t('pricing.business')}</h3>
            <div className="text-4xl font-bold text-gray-900 mb-4">৳3,500<span className="text-lg">{t('pricing.businessPeriodShort')}</span></div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2 justify-center">
                <span className="text-green-500">✓</span>
                {t('pricing.businessVideosCustom')}
              </li>
              <li className="flex items-center gap-2 justify-center">
                <span className="text-green-500">✓</span>
                {t('pricing.businessQuality')}
              </li>
              <li className="flex items-center gap-2 justify-center">
                <span className="text-green-500">✓</span>
                {t('pricing.businessTemplatesCustom')}
              </li>
              <li className="flex items-center gap-2 justify-center">
                <span className="text-green-500">✓</span>
                {t('pricing.businessAPI')}
              </li>
            </ul>
            <a href="/login" className="block w-full py-3 rounded-lg border-2 border-gray-300 text-gray-700 hover:bg-gray-50">
              {t('pricing.businessContact')}
            </a>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">{t('pricing.paymentMethods')}</p>
          <div className="flex justify-center gap-8 text-3xl">
            <span className="text-green-600" title={t('pricing.bKash')}>💳</span>
            <span className="text-purple-600" title={t('pricing.crypto')}>🪙</span>
            <span className="text-blue-600" title={t('pricing.nagad')}>⛔</span>
          </div>
        </div>
      </div>
    </section>
  )
}
