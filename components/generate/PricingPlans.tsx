'use client'

import PaymentModal from './PaymentModal'

interface PricingTier {
  name: string
  price: string
  videos: number | string
  quality: string
  watermark: boolean
  icon: string
  custom?: boolean
}

interface PricingPlansProps {
  tiers: PricingTier[]
  onSelectTier: (tier: string) => void
  showPayment: boolean
  selectedTier: string | null
  onClosePayment: () => void
}

export default function PricingPlans({ tiers, onSelectTier, showPayment, selectedTier, onClosePayment }: PricingPlansProps) {
  return (
    <div>
      <h2 className="text-3xl font-bold text-center mb-4 text-gray-800 dark:text-white">দামের পরিকল্পনা</h2>
      <p className="text-center text-gray-600 dark:text-gray-400 mb-12">আপনার যে প্লানের প্রয়োজন, সেটা বেছে নিন — সব নিরাপদ পেমেন্টে!</p>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tiers.map((tier, idx) => (
          <div key={tier.name} className={`relative rounded-2xl p-6 transition-all ${
            idx === 2 ? 'bg-blue-600 text-white shadow-2xl scale-105 ring-2 ring-blue-300' : 'bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-gray-700 hover:shadow-lg'
          }`}>
            {idx === 2 && <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-1 rounded-full text-sm font-bold">⭐ জনপ্রিয়</div>}
            <div className="text-center mb-4">
              <span className="text-4xl">{tier.icon}</span>
              <h3 className="text-xl font-bold mt-2">{tier.name}</h3>
              <p className="text-3xl font-extrabold mt-2">{tier.price}</p>
            </div>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2"><span className="text-green-400">✓</span> {tier.videos} ভিডিও/মাস</li>
              <li className="flex items-center gap-2"><span className="text-green-400">✓</span> {tier.quality} কোয়ালিটি</li>
              <li className={`flex items-center gap-2 ${tier.watermark ? 'line-through text-gray-400' : ''}`}>
                <span className={tier.watermark ? 'text-gray-400' : 'text-green-400'}>✓</span>
                {tier.watermark ? 'ওয়াটারমার্ক' : 'ওয়াটারমার্ক মুক্ত'}
              </li>
              {tier.custom && <li className="flex items-center gap-2"><span className="text-green-400">✓</span> কাস্টম টেমপ্লেট</li>}
            </ul>
            <button onClick={() => onSelectTier(tier.name)}
              className={`w-full py-3 rounded-xl font-bold transition-all ${
                idx === 2 ? 'bg-white text-blue-600 hover:bg-blue-50' : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}>
              {tier.name === 'Free' ? 'শুরু করুন (মুক্ত)' : 'কিনুন'}
            </button>
          </div>
        ))}
      </div>
      {showPayment && selectedTier && <PaymentModal tier={selectedTier} onClose={onClosePayment} />}
    </div>
  )
}
