export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/admin/tv-ad-stats — admin only, groupBy adKey
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req as any)

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart.getTime() - 7 * 86400000)
    const monthStart = new Date(todayStart.getTime() - 30 * 86400000)

    let today = 0, week = 0, month = 0
    let topAds: { adKey: string; adText: string; count: number }[] = []
    let total30d = 0

    try {
      const prismaAny = prisma as any
      const [cToday, cWeek, cMonth] = await Promise.all([
        prismaAny.tvAdClick.count({ where: { createdAt: { gte: todayStart } } }),
        prismaAny.tvAdClick.count({ where: { createdAt: { gte: weekStart } } }),
        prismaAny.tvAdClick.count({ where: { createdAt: { gte: monthStart } } }),
      ])
      today = cToday; week = cWeek; month = cMonth; total30d = cMonth

      const grouped = await prismaAny.tvAdClick.groupBy({
        by: ['adKey'],
        where: { createdAt: { gte: monthStart } },
        _count: { adKey: true },
        orderBy: { _count: { adKey: 'desc' } },
        take: 10,
      })
      // Fetch one sample adText per key
      for (const g of grouped) {
        const sample = await prismaAny.tvAdClick.findFirst({
          where: { adKey: g.adKey },
          select: { adText: true },
          orderBy: { createdAt: 'desc' },
        })
        topAds.push({ adKey: g.adKey, adText: sample?.adText || g.adKey, count: g._count.adKey })
      }
    } catch (e: any) {
      if (!String(e?.message || '').includes('does not exist')) throw e
    }

    const revenue30d = (total30d * 0.5) / 1000

    return NextResponse.json({ today, week, month, revenue30d, topAds, total30d })
  } catch (e: any) {
    if (String(e?.message || '').includes('Not authenticated') || String(e?.message || '').includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[tv-ad-stats] error:', e)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
