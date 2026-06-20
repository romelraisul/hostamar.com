import Stripe from 'stripe'

/**
 * Singleton Stripe client.
 * Import this instead of creating a new instance each request.
 */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
})

export default stripe

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
