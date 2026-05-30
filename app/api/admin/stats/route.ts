import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.customer.findUnique({
      where: { email: session.user.email },
      include: { orders: true, subscriptions: true, videos: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const stats = {
      totalCustomers: await prisma.customer.count(),
      totalOrders: await prisma.order.count({ where: { status: 'completed' } }),
      totalRevenue: await prisma.order.aggregate({
        where: { status: 'completed' },
        _sum: { amount: true }
      }),
      pendingOrders: await prisma.order.count({ where: { status: 'processing' } }),
      totalVideos: await prisma.video.count(),
      activeSubscriptions: await prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      newCustomersToday: await prisma.customer.count({
        where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } }
      }),
      monthlyRevenue: await prisma.order.aggregate({
        where: {
          status: 'completed',
          createdAt: { gte: new Date(new Date().setDate(new Date().getDate() - 30)) }
        },
        _sum: { amount: true }
      }),
      orderBreakdown: {
        free: await prisma.order.count({ where: { plan: 'FREE' } }),
        starter: await prisma.order.count({ where: { plan: 'STARTER' } }),
        business: await prisma.order.count({ where: { plan: 'BUSINESS' } }),
        enterprise: await prisma.order.count({ where: { plan: 'ENTERPRISE' } })
      }
    }

    return NextResponse.json({ success: true, data: stats })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}