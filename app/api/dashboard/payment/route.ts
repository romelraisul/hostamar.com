export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

const planDetails: Record<string, { price: number; videosPerMonth: number; storageGB: number }> = {
  starter: { price: 2000, videosPerMonth: 10, storageGB: 5 },
  business: { price: 3500, videosPerMonth: 30, storageGB: 20 },
  enterprise: { price: 6000, videosPerMonth: 999999, storageGB: 100 },
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