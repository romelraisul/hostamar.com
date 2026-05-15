import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const customer = await prisma.customer.findUnique({
      where: { email: session.user.email },
      include: {
        videos: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        services: true,
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Calculate this month
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const videosThisMonth = customer.videos.filter(
      (v: any) => new Date(v.createdAt) >= monthStart
    ).length

    const storageUsed =
      customer.videos.reduce((acc: number, v: any) => acc + (v.fileSize || 0), 0) /
      (1024 * 1024 * 1024)
    const usedStorageGB = Math.round(storageUsed * 100) / 100

    const activeSubscription = customer.subscriptions?.[0] || null

    return NextResponse.json({
      stats: {
        videos: {
          total: customer.videos.length,
          thisMonth: videosThisMonth,
        },
        services: {
          active: customer.services.filter((s: any) => s.status === 'active').length,
          total: customer.services.length,
        },
        subscription: activeSubscription
          ? {
              plan: activeSubscription.plan || 'Free',
              status: activeSubscription.status || 'active',
              nextBilling: activeSubscription.nextBillingDate
                ? new Date(activeSubscription.nextBillingDate).toLocaleDateString()
                : 'N/A',
              price: activeSubscription.price || 0,
            }
          : null,
        storage: {
          used: usedStorageGB,
          total: 5,
        },
      },
      recentVideos: customer.videos.slice(0, 5).map((v: any) => ({
        id: v.id,
        title: v.title || 'Untitled',
        status: v.status || 'processing',
        createdAt: v.createdAt,
      })),
    })
  } catch (error) {
    console.error('Stats fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}