export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalizePlan, getQuota } from '@/lib/subscription'
import { getAuthUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { plan, transactionId } = await req.json()
    if (!plan) {
      return NextResponse.json({ error: 'Plan is required' }, { status: 400 })
    }

    const user = await prisma.customer.findUnique({
      where: { email: authUser.email }
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // SECURITY: a subscription may only be activated against a real, verified
    // payment. Require a completed Transaction (admin-approved bKash/Nagad/
    // Rocket) or a paid Payment belonging to this customer. Never activate on
    // an unverified request.
    if (!transactionId) {
      return NextResponse.json(
        { error: 'A verified payment transactionId is required to activate a plan. Complete a payment first.' },
        { status: 402 }
      )
    }
    const verifiedTxn = await prisma.transaction.findFirst({
      where: {
        customerId: user.id,
        status: { in: ['completed', 'success'] },
        OR: [{ id: transactionId }, { gatewayTrxId: transactionId }],
      },
    })
    const verifiedPayment = verifiedTxn ? null : await prisma.payment.findFirst({
      where: {
        customerId: user.id,
        status: { in: ['paid', 'completed'] },
        OR: [{ id: transactionId }, { transactionId }, { providerPaymentId: transactionId }, { invoiceNumber: transactionId }],
      },
    })
    if (!verifiedTxn && !verifiedPayment) {
      return NextResponse.json(
        { error: 'Payment not verified. The referenced transaction is not a completed payment for this account.' },
        { status: 402 }
      )
    }

    const limits = {
      STARTER: { videoLimit: 10, quality: '1080p', watermark: false },
      BUSINESS: { videoLimit: 30, quality: '4K', watermark: false },
      ENTERPRISE: { videoLimit: -1, quality: '4K', watermark: false },
    }
    const planKey = String(plan).toUpperCase()
    const planLimits = limits[planKey] || limits.STARTER

    const now = new Date()
    const endDate = new Date(now.setMonth(now.getMonth() + 1))

    // Create subscription
    const subscription = await prisma.subscription.create({
      data: {
        customerId: user.id,
        plan: planKey,
        status: 'ACTIVE',
        videosPerMonth: planLimits.videoLimit,
        storageGB: planKey === 'ENTERPRISE' ? 100 : planKey === 'BUSINESS' ? 50 : 10,
        price: planKey === 'STARTER' ? 2000 : planKey === 'BUSINESS' ? 3500 : 6000,
        currency: 'BDT',
        billingCycle: 'monthly',
        nextBillingDate: endDate,
      }
    })

    // Update customer stage
    await prisma.customer.update({
      where: { id: user.id },
      data: { stage: `${planKey.toLowerCase()}_customer` }
    })

    // Create order record (revenue is derived from real completed payments)
    await prisma.order.create({
      data: {
        customerId: user.id,
        plan: planKey,
        amount: planKey === 'STARTER' ? 2000 : planKey === 'BUSINESS' ? 3500 : 6000,
        currency: 'BDT',
        status: 'completed',
      }
    })

    // Create notification
    await prisma.notification.create({
      data: {
        customerId: user.id,
        type: 'SUBSCRIPTION' as any,
        title: `🎉 ${planKey} প্যাকেজ সক্রিয় হয়েছে!`,
        message: `আপনি ${planKey} প্যাকেজে সাবস্ক্রাইব করেছেন। ${planLimits.videoLimit === -1 ? 'আনলিমিটেড' : planLimits.videoLimit} ভিডিও তৈরি করতে পারবেন।`,
        actionUrl: '/dashboard'
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        subscriptionId: subscription.id,
        plan: planKey,
        endDate,
        limits: planLimits,
        message: `${planKey} প্যাকেজ সফলভাবে সক্রিয় হয়েছে!`
      }
    })
  } catch (error) {
    console.error('Subscription error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.customer.findUnique({
      where: { email: authUser.email },
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

    // Unified gate: normalize to free|starter|business so all 6 products read one plan.
    const normalizedPlan = normalizePlan(currentPlanName)
    const unifiedQuota = getQuota({ plan: normalizedPlan, status: hasActiveSub ? 'active' : 'inactive' })

    return NextResponse.json({
      success: true,
      data: {
        currentPlan: normalizedPlan,
        legacyPlan: currentPlanName,
        plan: normalizedPlan,
        quota: unifiedQuota,
        subscriptionStatus: hasActiveSub ? 'active' : 'inactive',
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
