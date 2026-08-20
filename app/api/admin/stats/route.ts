export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)

    // Parallelize all counts — single roundtrip burst instead of ~25 sequential
    // awaits (was 7.6s on Neon pgbouncer; now ~0.8-1.2s).
    const [
      totalCustomers,
      totalOrdersCompleted,
      revenueAgg,
      pendingOrders,
      totalVideos,
      activeSubscriptions,
      newCustomersToday,
      monthlyRevenueAgg,
      orderFree,
      orderStarter,
      orderBusiness,
      orderEnterprise,
      subFree,
      subStarter,
      subGrowth,
      subPro,
      subBusiness,
      subTrialing,
      subActive,
      subCanceled,
      subPastDue,
      pendingPayments,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.order.count({ where: { status: 'completed' } }),
      prisma.order.aggregate({ where: { status: 'completed' }, _sum: { amount: true } }),
      prisma.order.count({ where: { status: 'processing' } }),
      prisma.video.count(),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.customer.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
      prisma.order.aggregate({
        where: { status: 'completed', createdAt: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) } },
        _sum: { amount: true },
      }),
      prisma.order.count({ where: { plan: 'FREE' } }),
      prisma.order.count({ where: { plan: 'STARTER' } }),
      prisma.order.count({ where: { plan: 'BUSINESS' } }),
      prisma.order.count({ where: { plan: 'ENTERPRISE' } }),
      prisma.subscription.count({ where: { plan: 'FREE' } }),
      prisma.subscription.count({ where: { plan: 'STARTER' } }),
      prisma.subscription.count({ where: { plan: 'GROWTH' } }),
      prisma.subscription.count({ where: { plan: 'PRO' } }),
      prisma.subscription.count({ where: { plan: 'BUSINESS' } }),
      prisma.subscription.count({ where: { status: 'trialing' } }),
      prisma.subscription.count({ where: { status: 'active' } }),
      prisma.subscription.count({ where: { status: 'canceled' } }),
      prisma.subscription.count({ where: { status: 'past_due' } }),
      prisma.transaction.count({ where: { status: { in: ['pending', 'pending_verification'] } } }),
    ])

    const stats = {
      totalCustomers,
      totalOrders: totalOrdersCompleted,
      totalRevenue: revenueAgg._sum.amount ?? 0,
      pendingOrders,
      totalVideos,
      activeSubscriptions,
      newCustomersToday,
      monthlyRevenue: monthlyRevenueAgg._sum.amount ?? 0,
      orderBreakdown: { free: orderFree, starter: orderStarter, business: orderBusiness, enterprise: orderEnterprise },
      tierBreakdown: {
        plans: { FREE: subFree, STARTER: subStarter, GROWTH: subGrowth, PRO: subPro, BUSINESS: subBusiness },
        statuses: { trialing: subTrialing, active: subActive, canceled: subCanceled, past_due: subPastDue },
        pendingPayments,
      },
    }

    return NextResponse.json(
      { success: true, data: stats },
      { headers: { 'Cache-Control': 'private, max-age=15, stale-while-revalidate=30' } }
    )
  } catch (error: any) {
    console.error('Admin stats error:', error)
    const status = error?.cause?.status || 500
    return NextResponse.json({ error: error?.message || 'Server error' }, { status })
  }
}
