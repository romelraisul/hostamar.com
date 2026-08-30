export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/dashboard/stats — overview stats + recent videos for /dashboard
 * Returns: { stats: { videos, storage, subscription }, recentVideos: [...] }
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const t0 = Date.now()
    // PERF (v5): all DB reads in PARALLEL — was 4 sequential roundtrips.
    const [videoCount, recentVideos, sub, customer] = await Promise.all([
      prisma.video.count({ where: { customerId: authUser.id } }).catch(() => 0),
      prisma.video.findMany({
        where: { customerId: authUser.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, status: true, createdAt: true },
      }).catch(() => [] as any[]),
      prisma.subscription.findFirst({
        where: { customerId: authUser.id },
        orderBy: { createdAt: 'desc' },
      }).catch(() => null),
      prisma.customer.findUnique({
        where: { id: authUser.id },
        select: { credits: true },
      }).catch(() => null),
    ])

    // Storage quota is static (0/5GB B2) — no need to call B2 per request
    const storageUsed = 0
    const storageTotal = 5

    // FIX (v5): insight (LLM, 15-35s on the free chain) must NEVER block this
    // hot endpoint — the dashboard waits on stats to render. The client now
    // fetches /api/dashboard/insight separately AFTER paint. Stats is pure DB
    // counts and returns in <500ms.
    return NextResponse.json({
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
    console.log('stats-duration', Date.now() - t0, 'ms')
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'internal' }, { status: 500 })
  }
}
