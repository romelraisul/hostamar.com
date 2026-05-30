"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Zap,
  CheckCircle,
  XCircle,
  Crown,
  Star,
  TrendingUp,
  Clock,
  Lock,
  RefreshCw
} from "lucide-react"

interface SubscriptionData {
  currentPlan: string;
  hasActiveSubscription: boolean;
  currentSubscription: Record<string, unknown>;
  totalSpent: number;
  totalOrders: number;
  videoLimit: number;
  quality: string;
}

export default function SubscriptionPage() {
  const router = useRouter()
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchSubscription()
  }, [])

  const fetchSubscription = async () => {
    try {
      const res = await fetch('/api/subscription', { credentials: 'include' })
      const data = await res.json()
      if (data.success) setSubscription(data.data)
      else if (data.error === 'Unauthorized') router.push('/login')
    } catch (err) {
      console.error('Fetch subscription error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (plan) => {
    setProcessing(true)
    try {
      // Redirect to payment page with plan info
      router.push(`/payment?plan=${plan}`)
    } catch (err) {
      console.error('Upgrade error:', err)
    } finally {
      setProcessing(false)
    }
  }

  const plans = [
    {
      id: 'free',
      name: 'ফ্রি',
      price: '৳0',
      period: '/মাস',
      features: ['৫ ভিডিও/মাস', '৭২০p কোয়ালিটি', '৩ টেমপ্লেট', 'ওয়াটারমার্ক আছে'],
      current: false,
      popular: false
    },
    {
      id: 'starter',
      name: 'স্টার্টার',
      price: '৳2,000',
      period: '/মাস',
      features: ['২০ ভিডিও/মাস', '১০৮০p কোয়ালিটি', '১০ টেমপ্লেট', 'প্রায়োরিটি সাপোর্ট'],
      current: subscription?.currentPlan === 'STARTER',
      popular: true
    },
    {
      id: 'business',
      name: 'বিজনেস',
      price: '৳3,500',
      period: '/মাস',
      features: ['আনলিমিটেড ভিডিও', '৪K কোয়ালিটি', 'সব টেমপ্লেট', 'API অ্যাক্সেস', 'কাস্টম ব্র্যান্ডিং'],
      current: subscription?.currentPlan === 'BUSINESS',
      popular: false
    },
    {
      id: 'enterprise',
      name: 'এন্টারপ্রাইজ',
      price: '৳6,000',
      period: '/মাস',
      features: ['আনলিমিটেড ভিডিও', '৪K কোয়ালিটি', 'সব ফিচার', '২৪/৭ সাপোর্ট', 'আমরা পোস্ট করি'],
      current: subscription?.currentPlan === 'ENTERPRISE',
      popular: false
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="animate-pulse text-white">লোড হচ্ছে...</div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
              <Crown className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">সাবস্ক্রিপশন ও বিলিং</span>
          </div>
        </div>
      </header>

      {/* Current Status */}
      <section className="max-w-6xl mx-auto px-4 pt-8 pb-4">
        {subscription?.hasActiveSubscription ? (
          <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-2xl p-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-green-400 mb-2">
                {subscription.currentPlan === 'STARTER' ? 'স্টার্টার' :
                 subscription.currentPlan === 'BUSINESS' ? 'বিজনেস' :
                 subscription.currentPlan === 'ENTERPRISE' ? 'এন্টারপ্রাইজ' : 'ফ্রি'} প্যাকেজ সক্রিয়
              </h2>
              <p className="text-green-300 text-sm">
                কোয়ালিটি: {subscription.quality} | ভিডিও সীমা: {subscription.videoLimit === -1 ? 'আনলিমিটেড' : subscription.videoLimit}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-green-300">পরবর্তী বিলিং: {new Date(subscription.currentSubscription?.endDate as string).toLocaleDateString('bn-BD')}</p>
              <button
                onClick={() => router.push('/payment')}
                className="mt-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition"
              >
                রニュー করুন
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-amber-600/20 border border-amber-500/30 rounded-2xl p-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-amber-400 mb-2">ফ্রি প্যাকেজ ব্যবহার করছেন</h2>
              <p className="text-amber-300 text-sm">5 ভিডিও সীমা ও 720p কোয়ালিটি | আরও ফিচার আনলক করতে আপগ্রেড করুন</p>
            </div>
            <button
              onClick={() => handleUpgrade('starter')}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded-lg transition"
            >
              আপগ্রেড করুন
            </button>
          </div>
        )}
      </section>

      {/* Usage Stats */}
      <section className="max-w-6xl mx-auto px-4 pb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white">{subscription?.totalSpent || 0}৳</div>
            <div className="text-xs text-gray-500 mt-1">মোট খরচ</div>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white">{subscription?.totalOrders || 0}</div>
            <div className="text-xs text-gray-500 mt-1">মোট অর্ডার</div>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{subscription?.videoLimit === -1 ? '∞' : subscription?.videoLimit || 5}</div>
            <div className="text-xs text-gray-500 mt-1">ভিডিও সীমা</div>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{subscription?.quality || '720p'}</div>
            <div className="text-xs text-gray-500 mt-1">কোয়ালিটি</div>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-bold text-white text-center mb-8">প্যাকেজ তুলনা</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map(plan => (
            <div
              key={plan.id}
              className={`rounded-2xl border p-6 relative transition-all ${
                plan.popular
                  ? 'border-blue-500 shadow-lg shadow-blue-500/20 bg-blue-600/10'
                  : plan.current
                    ? 'border-green-500 bg-green-600/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                  🔥 জনপ্রিয়
                </div>
              )}
              {plan.current && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                  ✅ বর্তমান
                </div>
              )}
              <h3 className="text-xl font-bold text-white mb-2 mt-2">{plan.name}</h3>
              <div className="text-3xl font-bold text-white mb-1">
                {plan.price}
                <span className="text-base font-normal text-gray-400">{plan.period}</span>
              </div>
              <ul className="space-y-2 mt-4">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={plan.current || plan.id === 'free'}
                className={`w-full mt-6 py-2.5 rounded-xl font-medium transition ${
                  plan.current || plan.id === 'free'
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {plan.current || plan.id === 'free' ? 'বর্তমান' : 'আপগ্রেড করুন'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}