/**
 * Lazy Stripe client singleton.
 * Only creates the client when first accessed, not at import time.
 * This prevents build failures on Vercel where STRIPE_SECRET_KEY is not set.
 */
import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    stripeInstance = new Stripe(key, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    })
  }
  return stripeInstance
}

export default getStripe

/** Stripe price IDs mapped to plan slugs */
export const PLANS: Record<string, { priceId: string; name: string; credits: number }> = {
  free: {
    priceId: process.env.STRIPE_PRICE_FREE || '',
    name: 'Free Trial',
    credits: 5,
  },
  starter: {
    priceId: process.env.STRIPE_PRICE_STARTER || '',
    name: 'Starter',
    credits: 10,
  },
  business: {
    priceId: process.env.STRIPE_PRICE_BUSINESS || '',
    name: 'Business',
    credits: 30,
  },
}

export function getPlanByPriceId(priceId: string) {
  for (const [slug, plan] of Object.entries(PLANS)) {
    if (plan.priceId === priceId) return { slug, ...plan }
  }
  return null
}
