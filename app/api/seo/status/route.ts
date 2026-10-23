import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/seo/status  (public — live SEO/marketing funnel JSON)
 * Aggregates SeoEvent rows: views by path, clicks by event, last 24h + all time.
 * Consumed by ~/marketing_status.json updater + openseo panel.
 */
export async function GET(_req: NextRequest) {
  try {
    const since24h = new Date(Date.now() - 24 * 3600 * 1000)
    const [total, last24h, byType, topPaths] = await Promise.all([
      prisma.seoEvent.count(),
      prisma.seoEvent.count({ where: { createdAt: { gte: since24h } } }),
      prisma.seoEvent.groupBy({ by: ['type'], _count: { type: true }, orderBy: { _count: { type: 'desc' } } }),
      prisma.seoEvent.groupBy({ by: ['url'], _count: { url: true }, where: { type: 'pageview' }, orderBy: { _count: { url: 'desc' } }, take: 10 }),
    ])
    return Response.json({
      ok: true,
      time: new Date().toISOString(),
      views_total: total,
      views_24h: last24h,
      events: byType.map((t) => ({ type: t.type, count: t._count.type })),
      top_pages: topPaths.map((p) => ({ url: p.url, views: p._count.url })),
    })
  } catch (e) {
    return Response.json({ ok: false, error: String(e).slice(0, 200) }, { status: 202 })
  }
}
