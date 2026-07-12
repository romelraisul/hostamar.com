"use client"

export const dynamic = 'force-dynamic'
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
import { useLocale } from "@/lib/locale-context"

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
  const { t } = useLocale()
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

  const handleUpgrade = async (plan: string) => {
    setProcessing(true)
    try {
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
      name: t('subscription.current'),
      price: '৳0',
      period: '/month',
      features: ['5 videos/month', '720p quality', '3 templates', 'Watermark'],
      current: false,
      popular: false
    },
    {
      id: 'starter',
      name: 'Starter',
      price: '৳2,000',
      period: '/month',
      features: ['20 videos/month', '1080p quality', '10 templates', 'Priority support'],
      current: subscription?.currentPlan === 'STARTER',
      popular: true
    },
    {
      id: 'business',
      name: 'Business',
      price: '৳3,500',
      period: '/month',
      features: ['Unlimited videos', '4K quality', 'All templates', 'API access', 'Custom branding'],
      current: subscription?.currentPlan === 'BUSINESS',
      popular: false
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '৳6,000',
      period: '/month',
      features: ['Unlimited videos', '4K quality', 'All features', '24/7 support', 'We post for you'],
      current: subscription?.currentPlan === 'ENTERPRISE',
      popular: false
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="animate-pulse text-white">{t('subscription.loading')}</div>
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
            <span className="text-xl font-bold text-white tracking-tight">{t('subscription.title')}</span>
          </div>
        </div>
      </header>

      {/* Current Status */}
      <section className="max-w-6xl mx-auto px-4 pt-8 pb-4">
        {subscription?.hasActiveSubscription ? (
          <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-2xl p-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-green-400 mb-2">
                {subscription.currentPlan} {t('subscription.activePlan')}
              </h2>
              <p className="text-green-300 text-sm">
                {t('subscription.quality')}: {subscription.quality} | {t('subscription.videoLimit')}: {subscription.videoLimit === -1 ? 'Unlimited' : subscription.videoLimit}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-green-300">{t('subscription.nextBilling')}: {subscription.currentSubscription?.endDate ? new Date(subscription.currentSubscription.endDate as string).toLocaleDateString('en-US') : 'N/A'}</p>
              <button
                onClick={() => router.push('/payment')}
                className="mt-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition"
              >
                {t('subscription.renew')}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-amber-600/20 border border-amber-500/30 rounded-2xl p-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-amber-400 mb-2">{t('subscription.usingFree')}</h2>
              <p className="text-amber-300 text-sm">{t('subscription.freePlanDesc')}</p>
            </div>
            <button
              onClick={() => handleUpgrade('starter')}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded-lg transition"
            >
              {t('subscription.upgrade')}
            </button>
          </div>
        )}
      </section>

      {/* Usage Stats */}
      <section className="max-w-6xl mx-auto px-4 pb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white">{subscription?.totalSpent || 0}৳</div>
            <div className="text-xs text-gray-500 mt-1">{t('subscription.totalSpent')}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white">{subscription?.totalOrders || 0}</div>
            <div className="text-xs text-gray-500 mt-1">{t('subscription.totalOrders')}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{subscription?.videoLimit === -1 ? '∞' : subscription?.videoLimit || 5}</div>
            <div className="text-xs text-gray-500 mt-1">{t('subscription.videoLimit')}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{subscription?.quality || '720p'}</div>
            <div className="text-xs text-gray-500 mt-1">{t('subscription.quality')}</div>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-bold text-white text-center mb-8">{t('subscription.comparePlans')}</h2>
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
                  {t('subscription.popular')}
                </div>
              )}
              {plan.current && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                  {t('subscription.currentLabel')}
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
                {plan.current || plan.id === 'free' ? t('subscription.current') : t('subscription.upgrade')}
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
