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
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Video analytics
    const videos = await prisma.video.findMany({
      where: { customerId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 30
    })

    const totalViews = videos.reduce((sum, v) => sum + (v.views || 0), 0)
    const totalDownloads = videos.reduce((sum, v) => sum + (v.downloads || 0), 0)
    const totalShares = videos.reduce((sum, v) => sum + (v.shares || 0), 0)

    // Revenue analytics
    const orders = await prisma.order.findMany({
      where: { customerId: user.id, status: 'completed' },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    const totalSpent = orders.reduce((sum, o) => sum + (o.amount || 0), 0)

    // Monthly breakdown
    const monthlyData = orders.reduce((acc: any, order) => {
      const month = new Date(order.createdAt).toLocaleString('bn-BD', { month: 'short', year: 'numeric' })
      if (!acc[month]) acc[month] = { orders: 0, revenue: 0 }
      acc[month].orders++
      acc[month].revenue += order.amount || 0
      return acc
    }, {})

    // Video performance
    const topVideos = [...videos]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 5)
      .map(v => ({
        id: v.id,
        title: v.title,
        views: v.views,
        downloads: v.downloads,
        shares: v.shares,
        status: v.status,
        createdAt: v.createdAt.toISOString()
      }))

    // Engagement rate
    const engagementRate = totalViews > 0
      ? ((totalDownloads + totalShares) / totalViews * 100).toFixed(1)
      : "0"

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalVideos: videos.length,
          totalViews,
          totalDownloads,
          totalShares,
          engagementRate: parseFloat(engagementRate),
          totalSpent
        },
        monthlyData,
        topVideos,
        videoBreakdown: {
          completed: videos.filter(v => v.status === 'ready').length,
          processing: videos.filter(v => v.status === 'processing').length,
          failed: videos.filter(v => v.status === 'failed').length
        },
        recentOrders: orders.slice(0, 5).map(o => ({
          id: o.id,
          plan: o.plan,
          amount: o.amount,
          status: o.status,
          date: o.createdAt.toISOString()
        }))
      }
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}