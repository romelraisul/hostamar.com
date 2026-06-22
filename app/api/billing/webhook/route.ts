import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * POST /api/billing/webhook
 *
 * Stripe webhook handler for subscription lifecycle events:
 *   - checkout.session.completed → activate subscription
 *   - customer.subscription.updated → sync plan changes
 *   - customer.subscription.deleted → downgrade to free
 *   - invoice.payment_succeeded → record payment
 *   - invoice.payment_failed → flag account
 *
 * Verify signature with STRIPE_WEBHOOK_SECRET.
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !secret) {
    return NextResponse.json({ error: 'missing signature or secret' }, { status: 400 })
  }

  // Verify webhook signature
  let event: any
  try {
    const body = await req.text()
    const { default: getStripe } = await import('@/lib/stripe')
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch (err: any) {
    console.error('[billing/webhook] signature verification failed:', err.message)
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 })
  }

  // Handle event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any
        const customerId = session.customer as string
        const email = session.customer_email || session.customer_details?.email
        const priceId = session.line_items?.data?.[0]?.price?.id || session.metadata?.priceId

        // Find or create customer record
        const customer = await prisma.customer.upsert({
          where: { email: email || '' },
          update: { stripeCustomerId: customerId },
          create: { email: email || '', name: session.customer_details?.name || 'Stripe User', stripeCustomerId: customerId },
        })

        // Create subscription record
        if (customer) {
          await prisma.subscription.create({
            data: {
              customerId: customer.id,
              plan: priceId || 'starter',
              status: 'active',
              videosPerMonth: 10,
              storageGB: 5,
              price: 2000,
              currency: 'BDT',
              billingCycle: 'monthly',
              nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          })
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as any
        const customerId = sub.customer as string
        const status = sub.status as string
        const priceId = sub.items?.data?.[0]?.price?.id

        // Update subscription record
        const customer = await prisma.customer.findFirst({
          where: { stripeCustomerId: customerId },
        })
        if (customer) {
          await prisma.subscription.updateMany({
            where: { customerId: customer.id, status: { not: 'cancelled' } },
            data: {
              status: status === 'active' ? 'active' : status === 'past_due' ? 'past_due' : 'cancelled',
              plan: priceId || 'starter',
              nextBillingDate: new Date((sub.current_period_end as number) * 1000),
            },
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const deletedSub = event.data.object as any
        const deletedCustomerId = deletedSub.customer as string
        const delCustomer = await prisma.customer.findFirst({
          where: { stripeCustomerId: deletedCustomerId },
        })
        if (delCustomer) {
          await prisma.subscription.updateMany({
            where: { customerId: delCustomer.id, status: 'active' },
            data: { status: 'cancelled' },
          })
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any
        console.log('[billing] Payment succeeded:', invoice.id, invoice.amount_paid)
        break
      }

      case 'invoice.payment_failed': {
        const failedInvoice = event.data.object as any
        console.error('[billing] Payment failed:', failedInvoice.id, failedInvoice.customer_email)
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('[billing/webhook] handler error:', err)
    return NextResponse.json({ error: 'handler error' }, { status: 500 })
  }
}
