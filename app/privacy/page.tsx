'use client';

import Link from 'next/link';
import { ArrowLeft, Shield, Eye } from 'lucide-react';
import { useLocale } from '@/lib/locale-context';

export default function PrivacyPage() {
  const { t } = useLocale();
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      

      <section className="container mx-auto px-4 py-20 max-w-3xl">
        <h1 className="text-4xl font-bold mb-8">{t('privacy.title')}</h1>
        <div className="prose prose-invert max-w-none">
          <p className="text-gray-400 mb-6">{t('privacy.lastUpdated')}</p>
          
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <Shield className="w-8 h-8 text-blue-400 mb-3" />
              <h3 className="font-bold mb-2">{t('privacy.dataProtection')}</h3>
              <p className="text-sm text-gray-400">{t('privacy.dataProtectionDesc')}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <Eye className="w-8 h-8 text-green-400 mb-3" />
              <h3 className="font-bold mb-2">{t('privacy.transparency')}</h3>
              <p className="text-sm text-gray-400">{t('privacy.transparencyDesc')}</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mt-8 mb-4">{t('privacy.section1Title')}</h2>
          <p className="text-gray-300 mb-4">{t('privacy.section1Desc')}</p>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">{t('privacy.section2Title')}</h2>
          <p className="text-gray-300 mb-4">{t('privacy.section2Desc')}</p>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">{t('privacy.section3Title')}</h2>
          <p className="text-gray-300 mb-4">{t('privacy.section3Desc')}</p>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">{t('privacy.section4Title')}</h2>
          <p className="text-gray-300 mb-4">{t('privacy.section4Desc')}</p>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">{t('privacy.section5Title')}</h2>
          <p className="text-gray-300 mb-4">{t('privacy.section5Desc')}<Link href="/contact" className="text-blue-400 hover:text-blue-300">/contact</Link></p>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">{t('privacy.section6Title')}</h2>
          <p className="text-gray-300 mb-4">{t('privacy.section6Desc')}</p>
        </div>
      </section>

      
    </div>
  );
}
