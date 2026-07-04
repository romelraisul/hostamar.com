import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const dbConfigured = !!process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    let totalCustomers = 0
    let newCustomersThisMonth = 0
    let totalVideos = 0
    let videosThisMonth = 0
    let activeServices = 0
    let activeSubscriptions = 0
    let totalOrders = 0
    let completedOrders = 0
    let totalRevenue = 0
    let revenueThisMonth = 0
    let totalPayments = 0
    let completedPayments = 0
    let monthlyOrders = 0
    let recentActivity: any[] = []
    let activeSubscriptionRows: any[] = []

    if (dbConfigured) {
      totalCustomers = await prisma.customer.count().catch(() => 0)
      newCustomersThisMonth = await prisma.customer.count({ where: { createdAt: { gte: startOfMonth } } }).catch(() => 0)
      totalVideos = await prisma.video.count().catch(() => 0)
      videosThisMonth = await prisma.video.count({ where: { createdAt: { gte: startOfMonth } } }).catch(() => 0)
      activeServices = await prisma.service.count({ where: { status: 'active' } }).catch(() => 0)
      activeSubscriptions = await prisma.subscription.count({ where: { status: 'active' } }).catch(() => 0)
      activeSubscriptionRows = await prisma.subscription.findMany({ where: { status: 'active' } }).catch(() => [])
      recentActivity = await prisma.activityLog.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }).catch(() => [])
      totalOrders = await prisma.order.count().catch(() => 0)
      completedOrders = await prisma.order.count({ where: { status: 'completed' } }).catch(() => 0)
      totalPayments = await prisma.payment.count().catch(() => 0)
      completedPayments = await prisma.payment.count({ where: { status: 'completed' } }).catch(() => 0)
      monthlyOrders = await prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }).catch(() => 0)

      totalRevenue = activeSubscriptionRows.reduce((sum, sub) => sum + (sub.price || 0), 0)
      revenueThisMonth = activeSubscriptionRows
        .filter(sub => new Date(sub.nextBillingDate) >= startOfMonth)
        .reduce((sum, sub) => sum + (sub.price || 0), 0)
    }

    const stats = {
      totalCustomers,
      newCustomersThisMonth,
      totalVideos,
      videosThisMonth,
      activeServices,
      activeSubscriptions,
      totalOrders,
      completedOrders,
      totalRevenue,
      revenueThisMonth,
      totalPayments,
      completedPayments,
      monthlyOrders,
    }

    const formattedActivity = recentActivity.map(activity => ({
      id: activity.id,
      action: activity.action,
      description: activity.description,
      customerEmail: activity.customerId ? 'Customer' : 'System',
      createdAt: new Date(activity.createdAt).toISOString(),
    }))

    return NextResponse.json({ stats, recentActivity: formattedActivity })
  } catch (error) {
    console.error('Admin dashboard error:', error)
    return NextResponse.json({ stats: {}, recentActivity: [] })
  }
}
