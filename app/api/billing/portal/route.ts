import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import stripe from '@/lib/stripe'

/**
 * POST /api/billing/customer-portal
 *
 * Creates a Stripe Customer Portal session so the user can
 * manage their subscription, view invoices, and update payment method.
 *
 * Body: { returnUrl?: string }
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { returnUrl } = await req.json().catch(() => ({}))
  const config = await stripe.billingPortal.configurations.create({
    business_profile: { headline: 'Hostamar Billing' },
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true },
      subscription_update: { enabled: true, products: [] },
    },
  })

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId || '',
    return_url: returnUrl || `${process.env.NEXTAUTH_URL}/dashboard/billing`,
    configuration: config.id,
  })

  return NextResponse.json({ url: session.url })
}
