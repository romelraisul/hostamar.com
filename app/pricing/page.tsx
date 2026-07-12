'use client';

import Link from 'next/link';
import { ArrowLeft, Check } from 'lucide-react';
import { useLocale } from '@/lib/locale-context';

export default function PricingPage() {
  const { t } = useLocale();
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      

      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            {t('pricing.pageTitle')}
          </h1>
          <p className="text-xl text-gray-400">{t('pricing.pageSubtitle')}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <div className="text-sm font-semibold text-blue-400 mb-2">{t('pricing.starterLabel')}</div>
            <div className="text-4xl font-bold mb-4">৳2,000<span className="text-lg text-gray-500">/month</span></div>
            <ul className="space-y-3 mb-8 text-sm text-gray-300">
              <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-400 mt-0.5" /> {t('pricing.starterDesc')}</li>
              <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-400 mt-0.5" /> {t('pricing.starterVideosLabel')}</li>
              <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-400 mt-0.5" /> {t('pricing.starterSSLLabel')}</li>
              <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-400 mt-0.5" /> {t('pricing.starterEmailLabel')}</li>
            </ul>
            <Link href="/signup?plan=starter" className="block w-full py-3 text-center bg-white/10 text-white rounded-lg hover:bg-white/20 transition">
              {t('pricing.starterCTALabel')}
            </Link>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-blue-600 p-8 rounded-2xl shadow-xl transform scale-105 border border-purple-400/20">
            <div className="text-sm font-semibold mb-2 opacity-90">{t('pricing.businessLabel')}</div>
            <div className="text-4xl font-bold mb-4">৳3,500<span className="text-lg opacity-75">/month</span></div>
            <ul className="space-y-3 mb-8 text-sm">
              <li className="flex items-start gap-2"><Check className="w-4 h-4 mt-0.5" /> {t('pricing.businessDesc')}</li>
              <li className="flex items-start gap-2"><Check className="w-4 h-4 mt-0.5" /> {t('pricing.businessVideosLabel')}</li>
              <li className="flex items-start gap-2"><Check className="w-4 h-4 mt-0.5" /> {t('pricing.businessTopicsLabel')}</li>
              <li className="flex items-start gap-2"><Check className="w-4 h-4 mt-0.5" /> {t('pricing.businessPriorityLabel')}</li>
              <li className="flex items-start gap-2"><Check className="w-4 h-4 mt-0.5" /> {t('pricing.businessSocialLabel')}</li>
            </ul>
            <Link href="/signup?plan=business" className="block w-full py-3 text-center bg-white text-purple-600 rounded-lg hover:bg-gray-100 transition font-semibold">
              {t('pricing.businessCTALabel')}
            </Link>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <div className="text-sm font-semibold text-purple-400 mb-2">{t('pricing.enterpriseLabel')}</div>
            <div className="text-4xl font-bold mb-4">৳6,000<span className="text-lg text-gray-500">/month</span></div>
            <ul className="space-y-3 mb-8 text-sm text-gray-300">
              <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-400 mt-0.5" /> {t('pricing.enterpriseDesc')}</li>
              <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-400 mt-0.5" /> {t('pricing.enterpriseVideosLabel')}</li>
              <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-400 mt-0.5" /> {t('pricing.enterpriseBrandingLabel')}</li>
              <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-400 mt-0.5" /> {t('pricing.enterpriseSupportLabel')}</li>
              <li className="flex items-start gap-2"><Check className="w-4 h-4 text-green-400 mt-0.5" /> {t('pricing.enterprisePostLabel')}</li>
            </ul>
            <Link href="/signup?plan=enterprise" className="block w-full py-3 text-center bg-white/10 text-white rounded-lg hover:bg-white/20 transition">
              {t('pricing.enterpriseCTALabel')}
            </Link>
          </div>
        </div>
      </section>

      
    </div>
  );
}
