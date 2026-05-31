'use client'

import Link from 'next/link'
import { ArrowLeft, Cloud, Video, Zap } from 'lucide-react'
import { useLocale } from '@/lib/locale-context'

export default function AboutContent() {
  const { t } = useLocale()
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-white/5 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Hostamar.com
          </div>
        </nav>
      </header>

      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          {t('about.title')}
        </h1>
        <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-16">
          {t('about.desc')}
        </p>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-20">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Cloud className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold mb-2">{t('about.cloudHosting')}</h3>
            <p className="text-gray-400">{t('about.cloudDesc')}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Video className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-2xl font-bold mb-2">{t('about.aiMarketing')}</h3>
            <p className="text-gray-400">{t('about.aiMarketingDesc')}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-2xl font-bold mb-2">{t('about.aiTools')}</h3>
            <p className="text-gray-400">{t('about.aiToolsDesc')}</p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl p-16">
          <h2 className="text-3xl font-bold mb-4">{t('about.ourMission')}</h2>
          <p className="text-lg opacity-90 mb-8">
            {t('about.missionDesc')}
          </p>
          <Link href="/signup" className="inline-block px-8 py-4 bg-white text-blue-600 text-lg font-semibold rounded-lg hover:bg-gray-100 transition">
            {t('about.getStarted')}
          </Link>
        </div>
      </section>

      <footer className="container mx-auto px-4 py-8 border-t border-white/10 text-center text-sm text-gray-500">
        <p>{t('about.copyright')}</p>
      </footer>
    </div>
  )
}
