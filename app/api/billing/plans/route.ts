import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import stripe, { PLANS } from '@/lib/stripe'
import prisma from '@/lib/prisma'

/**
 * GET /api/billing/plans
 * Returns available subscription plans.
 */
export async function GET() {
  const plans = Object.entries(PLANS).map(([slug, plan]) => ({
    slug,
    name: plan.name,
    credits: plan.credits,
    priceId: plan.priceId,
  }))
  return NextResponse.json({ plans })
}

/**
 * POST /api/billing/create-checkout
 * Creates a Stripe Checkout Session for the given price ID.
 *
 * Body: { priceId: string, successUrl?: string, cancelUrl?: string }
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { priceId, successUrl, cancelUrl } = body

  if (!priceId) {
    return NextResponse.json({ error: 'priceId required' }, { status: 400 })
  }

  // Verify the price ID is valid
  const plan = Object.values(PLANS).find(p => p.priceId === priceId)
  if (!plan) {
    return NextResponse.json({ error: 'invalid priceId' }, { status: 400 })
  }

  try {
    // Get or create Stripe customer
    const customer = await prisma.customer.findUnique({ where: { id: user.id } })
    let stripeCustomerId = customer?.stripeCustomerId

    if (!stripeCustomerId) {
      const stripeCustomer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user.id },
      })
      stripeCustomerId = stripeCustomer.id
      await prisma.customer.update({
        where: { id: user.id },
        data: { stripeCustomerId },
      })
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${process.env.NEXTAUTH_URL}/dashboard/billing?success=true`,
      cancel_url: cancelUrl || `${process.env.NEXTAUTH_URL}/dashboard/billing?canceled=true`,
      metadata: { userId: user.id, priceId },
      subscription_data: {
        trial_period_days: parseInt(process.env.TRIAL_PERIOD_DAYS || '7'),
        metadata: { userId: user.id },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('[billing/create-checkout]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
