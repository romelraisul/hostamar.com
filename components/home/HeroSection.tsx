'use client'

import { useLocale } from '@/lib/locale-context'

export default function HeroSection() {
  const { t } = useLocale()
  return (
    <>
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
            {t('hero.mainTitle')}
            <span className="text-blue-600">{t('hero.titleSuffix')}</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            {t('hero.desc')}
          </p>
          <div className="flex gap-4 justify-center mb-12">
            <a href="/login" className="px-8 py-4 bg-blue-600 text-white text-lg rounded-xl hover:bg-blue-700 transition-all transform hover:scale-105">
              {t('hero.startFree')}
            </a>
            <a href="#features" className="px-8 py-4 border-2 border-gray-300 text-gray-700 text-lg rounded-xl hover:border-blue-500 hover:text-blue-600 transition-all">
              {t('hero.watchDemo')}
            </a>
          </div>
          <div className="flex items-center justify-center gap-8 text-sm text-gray-500">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              {t('hero.trustedBy')}
            </span>
            <span>{t('hero.betaDiscount')}</span>
            <span>{t('hero.madeInBD')}</span>
          </div>
        </div>

        {/* Video Demo */}
        <div className="mt-16 bg-white rounded-2xl shadow-2xl overflow-hidden max-w-4xl mx-auto">
          <div className="bg-gray-900 p-4 flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <div className="bg-gray-100 p-8 text-center h-64 flex items-center justify-center">
            <div className="text-gray-400">
              <div className="text-6xl mb-4">🎬</div>
              <p className="text-lg">{t('hero.studioInterface')}</p>
              <p className="text-sm mt-2">{t('hero.templateFlow')}</p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
