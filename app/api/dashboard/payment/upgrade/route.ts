import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import prisma from '@/lib/prisma'

const planDetails: Record<string, { price: number; videosPerMonth: number; storageGB: number }> = {
  starter: { price: 2000, videosPerMonth: 10, storageGB: 5 },
  business: { price: 3500, videosPerMonth: 30, storageGB: 20 },
  enterprise: { price: 6000, videosPerMonth: 999999, storageGB: 100 },
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const customer = await prisma.customer.findUnique({
      where: { email: session.user.email },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const body = await request.json()
    const { plan } = body

    if (!plan || !planDetails[plan]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const planInfo = planDetails[plan]

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