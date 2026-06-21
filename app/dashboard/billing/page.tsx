"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

type Plan = {
  slug: string
  name: string
  credits: number
  priceId: string
}

export default function BillingPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/billing/plans')
      .then(r => r.json())
      .then(d => { setPlans(d.plans || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const subscribe = async (priceId: string) => {
    setSubscribing(priceId)
    try {
      const res = await fetch('/api/billing/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert('Failed to create checkout session')
      }
    } catch {
      alert('Network error')
    } finally {
      setSubscribing(null)
    }
  }

  if (!session) {
    return <div className="p-8 text-center">Please sign in to view billing.</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Billing & Plans</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Choose a plan that works for you. Cancel anytime.
        </p>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
            <p className="mt-4 text-gray-500">Loading plans...</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map(plan => (
              <div
                key={plan.slug}
                className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 flex flex-col"
              >
                <h2 className="text-xl font-bold mb-2">{plan.name}</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {plan.credits} videos/month
                </p>
                <div className="mt-auto">
                  <button
                    onClick={() => subscribe(plan.priceId)}
                    disabled={subscribing === plan.priceId}
                    className="w-full py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {subscribing === plan.priceId ? 'Redirecting...' : 'Subscribe'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-sm text-gray-600 dark:text-gray-400">
          <p className="font-semibold mb-1">💳 Secure payments powered by Stripe</p>
          <p>Your payment info is processed securely by Stripe. We never store full card details.</p>
        </div>
      </div>
    </div>
  )
}
