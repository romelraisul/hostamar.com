'use client'

import { useLocale } from '@/lib/locale-context'

export default function FeaturesSection() {
  const { t } = useLocale()
  return (
    <section id="features" className="py-20">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          {t('features.title')}
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-xl border hover:shadow-lg transition-all">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">💫</span>
            </div>
            <h3 className="text-xl font-bold mb-3">{t('features.aiGeneration')}</h3>
            <p className="text-gray-600">{t('features.aiGenerationDesc')}</p>
          </div>
          <div className="bg-white p-8 rounded-xl border hover:shadow-lg transition-all">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🎨</span>
            </div>
            <h3 className="text-xl font-bold mb-3">{t('features.banglaSupport')}</h3>
            <p className="text-gray-600">{t('features.banglaSupportDesc')}</p>
          </div>
          <div className="bg-white p-8 rounded-xl border hover:shadow-lg transition-all">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🚀</span>
            </div>
            <h3 className="text-xl font-bold mb-3">{t('features.fastExport')}</h3>
            <p className="text-gray-600">{t('features.fastExportDesc')}</p>
          </div>
          <div className="bg-white p-8 rounded-xl border hover:shadow-lg transition-all">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">📈</span>
            </div>
            <h3 className="text-xl font-bold mb-3">{t('features.analytics')}</h3>
            <p className="text-gray-600">{t('features.analyticsDesc')}</p>
          </div>
          <div className="bg-white p-8 rounded-xl border hover:shadow-lg transition-all">
            <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">📚</span>
            </div>
            <h3 className="text-xl font-bold mb-3">{t('features.templates')}</h3>
            <p className="text-gray-600">{t('features.templatesDesc')}</p>
          </div>
          <div className="bg-white p-8 rounded-xl border hover:shadow-lg transition-all">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🔒</span>
            </div>
            <h3 className="text-xl font-bold mb-3">{t('features.secure')}</h3>
            <p className="text-gray-600">{t('features.secureDesc')}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
