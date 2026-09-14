export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { PAYMENT_PLANS } from '@/lib/pricing'

// V-price-unification: plans/prices come ONLY from lib/pricing.ts PAYMENT_PLANS
// (Starter ৳599 · Pro ৳1,299 · Business ৳2,999). Enterprise is not sold by any
// checkout path and has no authoritative price — removed (2026-09-14 audit).
const planDetails: Record<string, { price: number; videosPerMonth: number; storageGB: number }> = {
  starter: { price: PAYMENT_PLANS.starter.price, videosPerMonth: 10, storageGB: 5 },
  pro: { price: PAYMENT_PLANS.pro.price, videosPerMonth: 30, storageGB: 20 },
  business: { price: PAYMENT_PLANS.business.price, videosPerMonth: 80, storageGB: 100 },
}

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const customer = await prisma.customer.findUnique({
      where: { email: authUser.email },
      include: {
        subscriptions: true,
      },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const activeSubscription = customer.subscriptions[0] || null

    // For demo, return empty payment history
    // In production, you'd have a Payment model
    const payments: any[] = []

    return NextResponse.json({
      subscription: activeSubscription,
      payments,
    })
  } catch (error) {
    console.error('Payment fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}