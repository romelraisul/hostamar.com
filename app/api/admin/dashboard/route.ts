import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    // Check if user is admin (in production, verify admin role)
    // For now, we'll allow access

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Get counts
    const [
      totalCustomers,
      newCustomersThisMonth,
      totalVideos,
      videosThisMonth,
      activeServices,
      activeSubscriptions,
      allSubscriptions,
      recentActivity,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
      prisma.video.count(),
      prisma.video.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
      prisma.service.count({
        where: { status: 'active' },
      }),
      prisma.subscription.count({
        where: { status: 'active' },
      }),
      prisma.subscription.findMany({
        where: { status: 'active' },
      }),
      prisma.activityLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ])

    const totalRevenue = allSubscriptions.reduce((sum, sub) => sum + sub.price, 0)
    const revenueThisMonth = allSubscriptions
      .filter(sub => new Date(sub.nextBillingDate) >= startOfMonth)
      .reduce((sum, sub) => sum + sub.price, 0)

    const stats = {
      totalCustomers,
      newCustomersThisMonth,
      totalVideos,
      videosThisMonth,
      activeServices,
      totalRevenue,
      revenueThisMonth,
      activeSubscriptions,
    }

    const formattedActivity = recentActivity.map(activity => ({
      id: activity.id,
      action: activity.action,
      description: activity.description,
      customerEmail: 'System',
      createdAt: activity.createdAt.toISOString(),
    }))

    return NextResponse.json({
      stats,
      recentActivity: formattedActivity,
    })
  } catch (error) {
    console.error('Admin dashboard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}