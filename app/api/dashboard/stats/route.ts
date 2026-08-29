export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { explainAnalytics } from '@/lib/model-in-every-point'

/**
 * GET /api/dashboard/stats — overview stats + recent videos for /dashboard
 * Returns: { stats: { videos, storage, subscription }, recentVideos: [...] }
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Videos count
    const videoCount = await prisma.video.count({ where: { customerId: authUser.id } }).catch(() => 0)
    const recentVideos = await prisma.video.findMany({
      where: { customerId: authUser.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, title: true, status: true, createdAt: true },
    }).catch(() => [])

    // Storage (B2)
    const storageUsed = 0
    const storageTotal = 5

    // Subscription
    const sub = await prisma.subscription.findFirst({
      where: { customerId: authUser.id },
      orderBy: { createdAt: 'desc' },
    }).catch(() => null)

    // Credits
    const customer = await prisma.customer.findUnique({
      where: { id: authUser.id },
      select: { credits: true },
    }).catch(() => null)

    // MODEL IN EVERY POINT: Bangla explanation of the numbers (non-blocking)
    const insight = await explainAnalytics({ videos: videoCount, recent: recentVideos.length, credits: customer?.credits ?? 0 }).catch(() => '')

    return NextResponse.json({
      insight: insight || null,
      totalVideos: videoCount,
      creditsBalance: customer?.credits ?? 6000,
      stats: {
        videos: { total: videoCount, thisMonth: 0 },
        storage: { used: storageUsed, total: storageTotal },
        subscription: sub ? { plan: sub.plan, status: sub.status, nextBilling: sub.nextBillingDate?.toISOString() ?? null } : null,
      },
      recentVideos: recentVideos.map(v => ({
        id: v.id,
        title: v.title || 'Untitled',
        status: v.status,
        createdAt: v.createdAt.toISOString(),
      })),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'internal' }, { status: 500 })
  }
}
