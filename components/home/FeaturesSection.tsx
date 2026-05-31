'use client'

import { useLocale } from '@/lib/locale-context'

export default function FeaturesSection() {
  const { t } = useLocale()
  return (
    <section id="features" className="py-20 bg-transparent">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
          {t('features.title')}
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-gray-200 dark:border-slate-700 hover:shadow-lg dark:hover:shadow-slate-700/50 transition-all">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">💫</span>
            </div>
            <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">{t('features.aiGeneration')}</h3>
            <p className="text-gray-600 dark:text-gray-300">{t('features.aiGenerationDesc')}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-gray-200 dark:border-slate-700 hover:shadow-lg dark:hover:shadow-slate-700/50 transition-all">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🎨</span>
            </div>
            <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">{t('features.banglaSupport')}</h3>
            <p className="text-gray-600 dark:text-gray-300">{t('features.banglaSupportDesc')}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-gray-200 dark:border-slate-700 hover:shadow-lg dark:hover:shadow-slate-700/50 transition-all">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/40 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🚀</span>
            </div>
            <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">{t('features.fastExport')}</h3>
            <p className="text-gray-600 dark:text-gray-300">{t('features.fastExportDesc')}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-gray-200 dark:border-slate-700 hover:shadow-lg dark:hover:shadow-slate-700/50 transition-all">
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">📈</span>
            </div>
            <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">{t('features.analytics')}</h3>
            <p className="text-gray-600 dark:text-gray-300">{t('features.analyticsDesc')}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-gray-200 dark:border-slate-700 hover:shadow-lg dark:hover:shadow-slate-700/50 transition-all">
            <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/40 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">📚</span>
            </div>
            <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">{t('features.templates')}</h3>
            <p className="text-gray-600 dark:text-gray-300">{t('features.templatesDesc')}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-gray-200 dark:border-slate-700 hover:shadow-lg dark:hover:shadow-slate-700/50 transition-all">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/40 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🔒</span>
            </div>
            <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">{t('features.secure')}</h3>
            <p className="text-gray-600 dark:text-gray-300">{t('features.secureDesc')}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
