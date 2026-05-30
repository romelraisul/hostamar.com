'use client'

import { useState } from 'react'

interface PaymentModalProps {
  tier: string
  onClose: () => void
}

export default function PaymentModal({ tier, onClose }: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'bkash' | 'nagad' | 'usdt' | 'rocket'>('bkash')
  const [phone, setPhone] = useState('')
  const [trxId, setTrxId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const prices: Record<string, string> = { Free: '0', Starter: '500', Pro: '2,000', Business: '5,000' }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    await new Promise(r => setTimeout(r, 2000))
    alert('আপনার পেমেন্ট প্রাপ্ত হয়েছে! আপনার অ্যাকাউন্ট আপগ্রেড হবে শার্টক সময়ে।')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
         onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">পেমেন্ট করুন</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 mb-6">
          <p className="font-bold text-lg">{tier} প্ল্যান</p>
          <p className="text-blue-600 dark:text-blue-400">৳{prices[tier]}/মাস</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">পেমেন্ট মেথড বেছে নিন</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'bkash' as const, label: 'bKash', icon: '🟠' },
                { key: 'nagad' as const, label: 'Nagad', icon: '🟢' },
                { key: 'rocket' as const, label: 'Rocket', icon: '🟡' },
                { key: 'usdt' as const, label: 'USDT', icon: '🔵' },
              ].map(m => (
                <button key={m.key} type="button"
                  onClick={() => setPaymentMethod(m.key)}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    paymentMethod === m.key
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                  }`}>
                  <span className="text-xl block">{m.icon}</span>
                  <span className="text-sm font-medium">{m.label}</span>
                </button>
              ))}
            </div>
          </div>
          {paymentMethod !== 'usdt' && (
            <div>
              <label className="block text-sm font-medium mb-1">মোবাইল নম্বর</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="০১XXXXXXXXX" required pattern="^01[0-9]{9}$"
                className="w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:bg-slate-700 dark:text-white" />
            </div>
          )}
          {paymentMethod === 'usdt' && (
            <div>
              <label className="block text-sm font-medium mb-1">USDT (BEP20) ওয়ালেট অ্যাড্রেস</label>
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="0x..." required
                className="w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:bg-slate-700 dark:text-white font-mono" />
            </div>
          )}
          {paymentMethod !== 'usdt' && (
            <div>
              <label className="block text-sm font-medium mb-1">ট্রানজেকশন ID</label>
              <input type="text" value={trxId} onChange={e => setTrxId(e.target.value)}
                placeholder="TRX-XXXXXXXXXX" required
                className="w-full p-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:bg-slate-700 dark:text-white" />
            </div>
          )}
          <button type="submit" disabled={isSubmitting}
            className={`w-full py-3 rounded-xl font-bold text-white transition-all ${
              isSubmitting ? 'bg-gray-400' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg'
            }`}>
            {isSubmitting ? '⏳ যাচাই করা হচ্ছে...' : '✅ পেমেন্ট পাঠান'}
          </button>
        </form>
        <p className="text-xs text-gray-400 text-center mt-4">পেমেন্ট নিশ্চিত হলে আপনাকে ইমেইলে confirmation পাঠানো হবে।</p>
      </div>
    </div>
  )
}
