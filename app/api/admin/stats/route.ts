import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin(req)

    const stats = {
      totalCustomers: await prisma.customer.count(),
      totalOrders: await prisma.order.count({ where: { status: 'completed' } }),
      totalRevenue: await prisma.order.aggregate({
        where: { status: 'completed' },
        _sum: { amount: true },
      }),
      pendingOrders: await prisma.order.count({ where: { status: 'processing' } }),
      totalVideos: await prisma.video.count(),
      activeSubscriptions: await prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      newCustomersToday: await prisma.customer.count({
        where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),
      monthlyRevenue: await prisma.order.aggregate({
        where: {
          status: 'completed',
          createdAt: { gte: new Date(new Date().setDate(new Date().getDate() - 30)) },
        },
        _sum: { amount: true },
      }),
      orderBreakdown: {
        free: await prisma.order.count({ where: { plan: 'FREE' } }),
        starter: await prisma.order.count({ where: { plan: 'STARTER' } }),
        business: await prisma.order.count({ where: { plan: 'BUSINESS' } }),
        enterprise: await prisma.order.count({ where: { plan: 'ENTERPRISE' } }),
      },
    }

    return NextResponse.json({ success: true, data: stats })
  } catch (error: any) {
    console.error('Admin stats error:', error)
    const status = error?.cause?.status || 500
    return NextResponse.json({ error: error?.message || 'Server error' }, { status })
  }
}
