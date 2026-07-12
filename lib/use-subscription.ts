'use client'

import { useEffect, useState } from 'react'
import {
  getQuota,
  normalizePlan,
  type PlanId,
  type PlanQuota,
  type SubscriptionLike,
  hasAccess as gateHasAccess,
  type ProductSlug,
} from '@/lib/subscription'

export interface UseSubscription {
  loading: boolean
  plan: PlanId
  status: string
  quota: PlanQuota
  raw: SubscriptionLike | null
  hasAccess: (product: ProductSlug) => boolean
}

// Shared client hook — every product page (video/hosting/chat/browser/ide/game)
// and the dashboard call this so the 6 products read ONE subscription.
export function useSubscription(): UseSubscription {
  const [loading, setLoading] = useState(true)
  const [raw, setRaw] = useState<SubscriptionLike | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/subscription')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!alive) return
        const d = json?.data
        if (d) {
          setRaw({
            plan: d.currentPlan ?? d.plan ?? 'free',
            status: d.subscriptionStatus ?? d.status ?? 'active',
          })
        }
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const quota = getQuota(raw)
  return {
    loading,
    plan: normalizePlan(raw?.plan),
    status: raw?.status || 'inactive',
    quota,
    raw,
    hasAccess: (product: ProductSlug) => gateHasAccess(raw, product),
  }
}
