export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/get-auth-user'

export async function GET(req: NextRequest) {
  try {
    // Prefer custom JWT (auth_token cookie via getAuthUser), fallback to NextAuth
    let email: string | null = null
    let customerId: string | null = null
    const jwtUser = await getAuthUser(req).catch(() => null)
    if (jwtUser?.email) {
      email = jwtUser.email
      customerId = jwtUser.id
    } else {
      const session = await getServerSession(authOptions)
      if (session?.user?.email) email = session.user.email
    }
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.customer.findUnique({ where: { email } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Video + order analytics in parallel
    const [videos, orders] = await Promise.all([
      prisma.video.findMany({ where: { customerId: user.id }, orderBy: { createdAt: 'desc' }, take: 30 }),
      prisma.order.findMany({ where: { customerId: user.id, status: 'completed' }, orderBy: { createdAt: 'desc' }, take: 50 }),
    ])

    const totalViews = videos.reduce((sum, v: any) => sum + (v.views || 0), 0)
    const totalDownloads = videos.reduce((sum, v: any) => sum + (v.downloads || 0), 0)
    const totalShares = videos.reduce((sum, v: any) => sum + (v.shares || 0), 0)
    const totalSpent = orders.reduce((sum, o: any) => sum + (o.amount || 0), 0)

    const monthlyData = orders.reduce((acc: any, order: any) => {
      const month = new Date(order.createdAt).toLocaleString('bn-BD', { month: 'short', year: 'numeric' })
      if (!acc[month]) acc[month] = { orders: 0, revenue: 0 }
      acc[month].orders++
      acc[month].revenue += order.amount || 0
      return acc
    }, {})

    const topVideos = [...videos]
      .sort((a: any, b: any) => (b.views || 0) - (a.views || 0))
      .slice(0, 5)
      .map((v: any) => ({ id: v.id, title: v.title, views: v.views, downloads: v.downloads, shares: v.shares, status: v.status, createdAt: v.createdAt.toISOString() }))

    const engagementRate = totalViews > 0 ? ((totalDownloads + totalShares) / totalViews * 100).toFixed(1) : '0'

    return NextResponse.json(
      {
        success: true,
        data: {
          overview: { totalVideos: videos.length, totalViews, totalDownloads, totalShares, engagementRate: parseFloat(engagementRate), totalSpent },
          monthlyData,
          topVideos,
          videoBreakdown: { completed: videos.filter((v: any) => v.status === 'ready').length, processing: videos.filter((v: any) => v.status === 'processing').length, failed: videos.filter((v: any) => v.status === 'failed').length },
          recentOrders: orders.slice(0, 5).map((o: any) => ({ id: o.id, plan: o.plan, amount: o.amount, status: o.status, date: o.createdAt.toISOString() })),
        },
      },
      { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' } }
    )
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
