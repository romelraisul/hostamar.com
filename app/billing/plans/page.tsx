"use client"

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

type Plan = {
  slug: string
  name: string
  credits: number
  priceId: string
  monthlyPrice?: number
}

const PLANS: Plan[] = [
  { slug: 'free', name: 'Free Trial', credits: 5, priceId: '', monthlyPrice: 0 },
  { slug: 'starter', name: 'Starter', credits: 10, priceId: '', monthlyPrice: 2000 },
  { slug: 'business', name: 'Business', credits: 30, priceId: '', monthlyPrice: 3500 },
]

export default function PlansPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [billingLoading, setBillingLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)

  const subscribe = async (priceId: string) => {
    if (!priceId) return
    setBillingLoading(true)
    try {
      const res = await fetch('/api/billing/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (e) {
      console.error('Checkout error:', e)
    } finally {
      setBillingLoading(false)
    }
  }

  const openPortal = async () => {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (e) {
      console.error('Portal error:', e)
    } finally {
      setPortalLoading(false)
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold mb-4">Sign in to view plans</h1>
          <a href="/login" className="px-6 py-3 bg-blue-600 text-white rounded-lg">Sign In</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-center mb-2">Choose your plan</h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-10">
          Start free, upgrade when you need more. Cancel anytime.
        </p>

        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {PLANS.map(plan => (
            <div
              key={plan.slug}
              className={`bg-white dark:bg-slate-800 rounded-2xl border-2 p-6 flex flex-col ${
                plan.slug === 'starter' ? 'border-blue-500 shadow-lg ring-2 ring-blue-200' : 'border-gray-200 dark:border-slate-700'
              }`}
            >
              {plan.slug === 'starter' && (
                <div className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full self-center mb-3">
                  MOST POPULAR
                </div>
              )}
              <h2 className="text-xl font-bold mb-1">{plan.name}</h2>
              <p className="text-sm text-gray-500 mb-4">{plan.credits} videos/month</p>
              <div className="text-3xl font-bold mb-6">
                {plan.monthlyPrice === 0 ? (
                  <span>Free</span>
                ) : (
                  <>
                    ৳{plan.monthlyPrice.toLocaleString()}
                    <span className="text-base font-normal text-gray-500">/mo</span>
                  </>
                )}
              </div>
              <ul className="space-y-2 mb-8 text-sm text-gray-600 dark:text-gray-400">
                <li>✓ {plan.credits} AI video credits/mo</li>
                <li>✓ 720p export</li>
                <li>✓ All templates</li>
                {plan.slug !== 'free' && <li>✓ Priority support</li>}
              </ul>
              <div className="mt-auto">
                {plan.slug === 'free' ? (
                  <a href="/generate" className="block w-full py-3 text-center rounded-xl border-2 border-gray-300 font-semibold hover:bg-gray-50 transition">
                    Start Free
                  </a>
                ) : (
                  <button
                    onClick={() => subscribe(plan.priceId)}
                    disabled={billingLoading || !plan.priceId}
                    className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {billingLoading ? 'Redirecting...' : 'Subscribe'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Customer Portal */}
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-3">Already have a subscription?</p>
          <button
            onClick={openPortal}
            disabled={portalLoading}
            className="px-6 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
          >
            {portalLoading ? 'Loading...' : 'Manage Billing →'}
          </button>
        </div>

        <div className="mt-10 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-sm text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
          <p className="font-semibold mb-1">🔒 Secure payments via Stripe</p>
          <p>Your payment details are processed by Stripe. We never store full card numbers.</p>
        </div>
      </div>
    </div>
  )
}
