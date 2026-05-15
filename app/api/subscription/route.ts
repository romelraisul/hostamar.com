import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { plan, paymentMethod, transactionId } = await request.json()
    if (!plan) {
      return NextResponse.json({ error: 'Plan is required' }, { status: 400 })
    }

    const user = await prisma.customer.findUnique({
      where: { email: session.user.email }
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const limits = {
      STARTER: { videoLimit: 10, quality: '1080p', watermark: false },
      BUSINESS: { videoLimit: 30, quality: '4K', watermark: false },
      ENTERPRISE: { videoLimit: -1, quality: '4K', watermark: false },
    }
    const planLimits = limits[plan] || limits.STARTER

    const now = new Date()
    const endDate = new Date(now.setMonth(now.getMonth() + 1))

    // Create subscription
    const subscription = await prisma.subscription.create({
      data: {
        customerId: user.id,
        plan: plan,
        status: 'ACTIVE',
        videosPerMonth: planLimits.videoLimit,
        storageGB: plan === 'ENTERPRISE' ? 100 : plan === 'BUSINESS' ? 50 : 10,
        price: plan === 'STARTER' ? 2000 : plan === 'BUSINESS' ? 3500 : 6000,
        currency: 'BDT',
        billingCycle: 'monthly',
        nextBillingDate: endDate,
      }
    })

    // Update customer stage
    await prisma.customer.update({
      where: { id: user.id },
      data: { stage: `${plan.toLowerCase()}_customer` }
    })

    // Create order record
    await prisma.order.create({
      data: {
        customerId: user.id,
        plan,
        amount: plan === 'STARTER' ? 2000 : plan === 'BUSINESS' ? 3500 : 6000,
        currency: 'BDT',
        status: 'completed',
      }
    })

    // Create notification
    await prisma.notification.create({
      data: {
        customerId: user.id,
        type: 'SUBSCRIPTION' as any,
        title: `🎉 ${plan} প্যাকেজ সক্রিয় হয়েছে!`,
        message: `আপনি ${plan} প্যাকেজে সাবস্ক্রাইব করেছেন। ${planLimits.videoLimit === -1 ? 'আনলিমিটেড' : planLimits.videoLimit} ভিডিও তৈরি করতে পারবেন।`,
        actionUrl: '/dashboard'
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        subscriptionId: subscription.id,
        plan,
        endDate,
        limits: planLimits,
        message: `${plan} প্যাকেজ সফলভাবে সক্রিয় হয়েছে!`
      }
    })
  } catch (error) {
    console.error('Subscription error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.customer.findUnique({
      where: { email: session.user.email },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const currentSub = user.subscriptions[0]
    const hasActiveSub = currentSub && currentSub.status === 'ACTIVE' && new Date(currentSub.nextBillingDate) > new Date()

    const planLimits = {
      STARTER: { videoLimit: 10, quality: '1080p', watermark: false },
      BUSINESS: { videoLimit: 30, quality: '4K', watermark: false },
      ENTERPRISE: { videoLimit: -1, quality: '4K', watermark: false },
    }
    const currentPlanName = currentSub?.plan || 'FREE'
    const currentLimits = planLimits[currentPlanName] || { videoLimit: 5, quality: '720p', watermark: true }

    return NextResponse.json({
      success: true,
      data: {
        currentPlan: currentPlanName,
        subscriptionStatus: hasActiveSub ? 'ACTIVE' : 'INACTIVE',
        currentSubscription: currentSub || null,
        hasActiveSubscription: hasActiveSub,
        videoLimit: currentLimits.videoLimit,
        quality: currentLimits.quality,
        watermark: currentLimits.watermark,
        totalOrders: user.orders.length,
        totalSpent: user.orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + (o.amount || 0), 0),
        recentOrders: user.orders.slice(0, 5)
      }
    })
  } catch (error) {
    console.error('Subscription GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
