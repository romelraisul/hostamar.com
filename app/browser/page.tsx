'use client';

import Link from 'next/link';
import { Globe, Search, Brain, Languages, FileText, ArrowLeft } from 'lucide-react';
import { useLocale } from '@/lib/locale-context';

export default function BrowserPage() {
  const { t } = useLocale();

  const features = [
    { icon: Search, title: t('browser.smartSearch'), desc: t('browser.smartSearchDesc') },
    { icon: Brain, title: t('browser.summarization'), desc: t('browser.summarizationDesc') },
    { icon: Languages, title: t('browser.translation'), desc: t('browser.translationDesc') },
    { icon: FileText, title: t('browser.researchAssistant'), desc: t('browser.researchAssistantDesc') },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-white/5 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="text-2xl font-bold bg-gradient-to-r from-green-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
            AI Browser
          </div>
        </nav>
      </header>

      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-cyan-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <Globe className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold mb-6">{t('browser.title')}</h1>
          <p className="text-xl text-gray-400 mb-8">
            {t('browser.subtitle')}
          </p>
          <div className="flex gap-4 justify-center">
            <button className="px-6 py-3 bg-gradient-to-r from-green-500 to-cyan-500 rounded-lg font-semibold hover:from-green-600 hover:to-cyan-600 transition">
              {t('browser.launch')}
            </button>
            <button className="px-6 py-3 border border-green-500/50 rounded-lg hover:bg-green-500/10 transition">
              {t('browser.watchDemo')}
            </button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <feature.icon className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="font-bold mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="container mx-auto px-4 py-8 border-t border-white/10 text-center text-sm text-gray-500">
        <p>{t('browser.footer')}</p>
      </footer>
    </div>
  );
}