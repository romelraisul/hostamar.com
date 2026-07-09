'use client'

import { useLocale } from '@/lib/locale-context'

export default function Footer() {
  const { t } = useLocale()
  return (
    <footer className="bg-gray-900 text-white py-16">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">H</span>
              </div>
              <span className="text-xl font-bold">Hostamar</span>
            </div>
            <p className="text-gray-400">
              {t('footer.buildPlay')}
            </p>
            <p className="text-gray-400 mt-2">
              {t('footer.tagline')}
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-4">{t('footer.product')}</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#features" className="hover:text-white">{t('footer.featuresLink')}</a></li>
              <li><a href="#pricing" className="hover:text-white">{t('footer.pricing')}</a></li>
              <li><a href="/login" className="hover:text-white">{t('footer.signUp')}</a></li>
              <li><a href="/login" className="hover:text-white">{t('footer.loginLink')}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">{t('footer.company')}</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="/about" className="hover:text-white">{t('footer.about')}</a></li>
              <li><a href="/blog" className="hover:text-white">{t('footer.blog')}</a></li>
              <li><a href="/contact" className="hover:text-white">{t('footer.contact')}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">{t('footer.legal')}</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="/privacy" className="hover:text-white">{t('footer.privacy')}</a></li>
              <li><a href="/terms" className="hover:text-white">{t('footer.terms')}</a></li>
              <li><a href="/privacy" className="hover:text-white">{t('footer.refund')}</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>{t('footer.madeIn')}</p>
        </div>
      </div>
    </footer>
  )
}
