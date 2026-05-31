'use client'

import { useLocale } from '@/lib/locale-context'

export default function CryptoPaymentPageClient() {
  const { t } = useLocale()

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {t('crypto.title')}
          </h1>
          <p className="text-lg text-gray-600">
            {t('crypto.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-xl font-bold mb-4">{t('crypto.howItWorks')}</h2>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-bold">1</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">{t('crypto.choosePlan')}</h3>
                    <p className="text-sm text-gray-600">{t('crypto.choosePlanDesc')}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-bold">2</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">{t('crypto.sendUSDT')}</h3>
                    <p className="text-sm text-gray-600">{t('crypto.sendUSDTDesc')}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-bold">3</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">{t('crypto.shareTXID')}</h3>
                    <p className="text-sm text-gray-600">{t('crypto.shareTXIDDesc')}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-bold">4</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">{t('crypto.getVerified')}</h3>
                    <p className="text-sm text-gray-600">{t('crypto.getVerifiedDesc')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-xl font-bold mb-4">{t('crypto.pricing')}</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span>Starter</span>
                  <span className="font-bold text-blue-600">৳2,000</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="font-semibold">Business</span>
                  <span className="font-bold text-blue-600">৳3,500</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span>Enterprise</span>
                  <span className="font-bold text-blue-600">৳6,000</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-xl font-bold mb-4">{t('crypto.walletAddress')}</h2>
              <p className="text-sm text-gray-600 mb-4">{t('ossu.network')}</p>
              <div className="bg-gray-900 rounded-xl p-4 text-center">
                <div className="text-5xl mb-3">💎</div>
                <code className="text-green-400 font-mono text-xs break-all">
                  0x16Bfd806297feaC12FC4b8A6c95079E8aADeC858
                </code>
              </div>
              <div className="mt-4 pt-4 border-t text-sm text-gray-600">
                <p>{t('ossu.network')}</p>
                <p>{t('ossu.fee')}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-xl font-bold mb-4">{t('crypto.verifyPayment')}</h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm space-y-2">
                <p className="font-semibold">{t('ossu.verifySteps')}</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>{t('ossu.stepSendExact')}</li>
                  <li>{t('ossu.stepCopyTXID')}</li>
                  <li>{t('ossu.stepWhatsApp')}</li>
                  <li>{t('ossu.stepIncludeEmail')}</li>
                </ol>
              </div>
              <a href="https://wa.me/8801822417463" target="_blank" rel="noopener" className="mt-3 block">
                <button className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold">
                  {t('crypto.whatsapp')}
                </button>
              </a>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6 mt-8">
          <h2 className="text-lg font-bold mb-3">{t('crypto.otherMethods')}</h2>
          <a href="/dashboard/payment" className="block mb-4">
            <button className="w-full py-3 border rounded-lg font-semibold">
              {t('crypto.bKashNagad')}
            </button>
          </a>
        </div>
      </div>
    </div>
  )
}
