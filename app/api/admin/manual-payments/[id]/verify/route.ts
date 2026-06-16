import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { markTrialConverted } from '@/lib/trial'

/**
 * Admin: mark a manual payment as "paid" → creates a Subscription row +
 * marks the customer's trial "converted" + deactivates other active subs.
 *
 * POST /api/admin/manual-payments/[id]/verify
 *   body: { plan?: string }  — overrides Payment.planName if provided
 * auth: Bearer <ADMIN_API_TOKEN>
 *
 * Phase 0.3: until bKash PG webhook (Phase 1), this is the activation path.
 */

const PLAN_PRICES_BDT: Record<string, { price: number; videosPerMonth: number; storageGB: number }> = {
  starter:    { price: 2000,  videosPerMonth: 10,  storageGB: 5  },
  business:   { price: 3500,  videosPerMonth: 30,  storageGB: 20 },
  enterprise: { price: 6000,  videosPerMonth: 999999, storageGB: 100 },
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = request.headers.get('authorization') || ''
  const expected = process.env.ADMIN_API_TOKEN
  if (!expected) {
    return NextResponse.json({ error: 'ADMIN_API_TOKEN not set' }, { status: 503 })
  }
  if (!auth.startsWith('Bearer ') || auth.slice(7) !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const paymentId = params.id
  const body = await request.json().catch(() => ({}))
  const planOverride = body?.plan as string | undefined

  const payment = await (prisma as any).payment.findUnique({ where: { id: paymentId } })
  if (!payment) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
  }
  if (payment.status !== 'pending') {
    return NextResponse.json(
      { error: `Payment already ${payment.status}, can't reverify` },
      { status: 409 }
    )
  }

  const planKey = (planOverride || payment.planName || 'starter').toLowerCase()
  const planInfo = PLAN_PRICES_BDT[planKey]
  if (!planInfo) {
    return NextResponse.json(
      { error: `Unknown plan "${planKey}". Known: ${Object.keys(PLAN_PRICES_BDT).join(', ')}` },
      { status: 400 }
    )
  }

  const now = new Date()
  const nextBilling = new Date(now)
  nextBilling.setMonth(nextBilling.getMonth() + 1)

  await (prisma as any).payment.update({
    where: { id: paymentId },
    data: { status: 'paid', startsAt: now, endsAt: nextBilling },
  })

  await (prisma as any).subscription.updateMany({
    where: { customerId: payment.customerId, status: 'active' },
    data: { status: 'cancelled' },
  })

  const subscription = await (prisma as any).subscription.create({
    data: {
      customerId: payment.customerId,
      plan: planKey,
      status: 'active',
      price: planInfo.price,
      videosPerMonth: planInfo.videosPerMonth,
      storageGB: planInfo.storageGB,
      currency: 'BDT',
      billingCycle: 'monthly',
      nextBillingDate: nextBilling,
    },
  })

  await markTrialConverted(payment.customerId, planKey)

  return NextResponse.json({ success: true, payment: { id: payment.id, status: 'paid' }, subscription: { id: subscription.id, plan: planKey, status: 'active' } })
}
