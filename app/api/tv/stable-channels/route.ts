export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/tv/stable-channels (public)
 * Returns top N channels by (stabilityScore DESC, popularityScore DESC).
 * Auto-seeds 50 BD channels into TvChannelStability on first call.
 * Query: ?limit=20&country=bd
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
  const country = searchParams.get('country') || 'bd'

  try {
    // Auto-seed on first call: 50 BD channels with .m3u8 + logo
    const count = await prisma.tvChannelStability.count()
    if (count === 0) {
      const seed = await prisma.tvIptvChannel.findMany({
        where: {
          country,
          isLive: true,
          url: { contains: '.m3u8' },
          logo: { not: null },
        },
        take: 50,
        select: { id: true, views: true },
      })
      if (seed.length > 0) {
        await prisma.tvChannelStability.createMany({
          data: seed.map((c, i) => ({
            channelId: c.id,
            stabilityScore: 50 + Math.floor(Math.random() * 40), // 50-89 initial
            popularityScore: c.views,
            successCount: 0,
            failCount: 0,
            avgLoadTimeMs: 9999,
          })),
          skipDuplicates: true,
        })
      }
    }

    // Fetch top stable channels
    const rows = await prisma.tvChannelStability.findMany({
      where: { stabilityScore: { gt: 0 } },
      orderBy: [{ stabilityScore: 'desc' }, { popularityScore: 'desc' }],
      take: limit,
    })

    if (rows.length === 0) {
      return NextResponse.json({ ok: true, total: 0, items: [], source: 'empty' })
    }

    // Join with channel data
    const channels = await prisma.tvIptvChannel.findMany({
      where: { id: { in: rows.map((r) => r.channelId) } },
      select: { id: true, name: true, url: true, logo: true, category: true, country: true, views: true },
    })
    const byId = new Map(channels.map((c) => [c.id, c]))

    const items = rows
      .map((r) => {
        const c = byId.get(r.channelId)
        if (!c) return null
        return {
          id: c.id,
          title: c.name,
          url: c.url,
          logo: c.logo,
          category: c.category,
          country: c.country,
          source: 'iptv-stable',
          stabilityScore: r.stabilityScore,
          popularityScore: r.popularityScore,
        }
      })
      .filter(Boolean)

    return NextResponse.json({ ok: true, total: items.length, items })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'internal' }, { status: 500 })
  }
}
