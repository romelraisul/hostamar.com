export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { PAYMENT_PLANS } from '@/lib/pricing'

// V-price-unification: plans/prices come ONLY from lib/pricing.ts PAYMENT_PLANS
// (Starter ৳990 · Pro ৳1,900 · Business ৳2,900). Enterprise is not sold by any
// checkout path and has no authoritative price — removed (2026-09-14 audit).
const planDetails: Record<string, { price: number; videosPerMonth: number; storageGB: number }> = {
  starter: { price: PAYMENT_PLANS.starter.price, videosPerMonth: 10, storageGB: 5 },
  pro: { price: PAYMENT_PLANS.pro.price, videosPerMonth: 30, storageGB: 20 },
  business: { price: PAYMENT_PLANS.business.price, videosPerMonth: 80, storageGB: 100 },
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const customer = await prisma.customer.findUnique({
      where: { email: authUser.email },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const body = await req.json()
    const { plan } = body

    if (!plan || !planDetails[plan]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const planInfo = planDetails[plan]

    // V-price-unification (money-loop fix): activating a paid plan requires a
    // real completed payment for this customer — same rule as POST /api/subscription.
    // This route previously created an ACTIVE subscription with no payment at all.
    const paidPayment = await prisma.payment.findFirst({
      where: { customerId: customer.id, status: { in: ['paid', 'completed', 'success'] } },
      orderBy: { createdAt: 'desc' },
    })
    if (!paidPayment) {
      return NextResponse.json(
        { error: 'payment_required', message: 'Complete a payment first — POST /api/payment/create.' },
        { status: 402 }
      )
    }

    // Calculate next billing date (1 month from now)
    const nextBillingDate = new Date()
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)

    // Deactivate existing subscriptions
    await prisma.subscription.updateMany({
      where: { customerId: customer.id, status: 'active' },
      data: { status: 'cancelled' },
    })

    // Create new subscription
    const subscription = await prisma.subscription.create({
      data: {
        customerId: customer.id,
        plan,
        status: 'active',
        price: planInfo.price,
        videosPerMonth: planInfo.videosPerMonth,
        storageGB: planInfo.storageGB,
        billingCycle: 'monthly',
        nextBillingDate,
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        customerId: customer.id,
        action: 'subscription_upgraded',
        description: `Upgraded to ${plan} plan - ৳${planInfo.price}/month`,
      },
    })

    return NextResponse.json({ 
      success: true, 
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        price: subscription.price,
      }
    })
  } catch (error) {
    console.error('Payment upgrade error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}