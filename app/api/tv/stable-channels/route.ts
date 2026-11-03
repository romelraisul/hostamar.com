export const dynamic = 'force-dynamic'
export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { getTursoEdgeClient } from '@/lib/turso-edge'

interface StabilityRow {
  channelId: string
  stabilityScore: number
  popularityScore: number
}

interface ChannelRow {
  id: string
  name: string
  url: string
  logo: string | null
  category: string | null
  country: string | null
  views: number
}

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
    const db = getTursoEdgeClient()

    // Check if stability table exists and has data
    const countRes = await db.execute('SELECT COUNT(*) as cnt FROM "TvChannelStability"')
    const count = (countRes.rows[0]?.cnt as number) || 0

    if (count === 0) {
      // Auto-seed on first call: 50 BD channels with .m3u8 + logo
      const seedRes = await db.execute({
        sql: 'SELECT "id", "views" FROM "TvIptvChannel" WHERE "country" = ? AND "url" LIKE ? AND "logo" IS NOT NULL ORDER BY "views" DESC LIMIT 50',
        args: [country, '%.m3u8%']
      })
      if (seedRes.rows.length > 0) {
        for (let i = 0; i < seedRes.rows.length; i++) {
          const c = seedRes.rows[i] as unknown as { id: string; views: number }
          await db.execute({
            sql: 'INSERT INTO "TvChannelStability" ("channelId", "stabilityScore", "popularityScore", "successCount", "failCount", "avgLoadTimeMs") VALUES (?, ?, ?, 0, 0, 9999)',
            args: [c.id, 50 + Math.floor(Math.random() * 40), c.views]
          })
        }
      }
    }

    // Fetch top stable channels
    const rowsRes = await db.execute({
      sql: 'SELECT "channelId", "stabilityScore", "popularityScore" FROM "TvChannelStability" WHERE "stabilityScore" > 0 ORDER BY "stabilityScore" DESC, "popularityScore" DESC LIMIT ?',
      args: [limit]
    })
    const rows = rowsRes.rows as unknown as StabilityRow[]

    if (rows.length === 0) {
      // Fallback: return top tvIptvChannel directly if stability table empty
      const fallbackRes = await db.execute({
        sql: 'SELECT "id", "name", "url", "logo", "category", "country", "views" FROM "TvIptvChannel" WHERE "country" = ? AND "url" LIKE ? AND "logo" IS NOT NULL ORDER BY "views" DESC LIMIT ?',
        args: [country, '%.m3u8%', limit]
      })
      const items = (fallbackRes.rows as unknown as ChannelRow[]).map((c) => ({
        id: c.id, title: c.name, url: c.url, logo: c.logo, category: c.category,
        country: c.country, source: 'iptv-fallback', stabilityScore: 50, popularityScore: c.views
      }))
      return NextResponse.json({ ok: true, total: items.length, items })
    }

    // Join with channel data
    const channelIds = rows.map((r) => r.channelId)
    const placeholders = channelIds.map(() => '?').join(',')
    const channelsRes = await db.execute({
      sql: `SELECT "id", "name", "url", "logo", "category", "country", "views" FROM "TvIptvChannel" WHERE "id" IN (${placeholders})`,
      args: channelIds
    })
    const byId: Map<string, ChannelRow> = new Map(
      (channelsRes.rows as unknown as ChannelRow[]).map((c) => [c.id, c])
    )

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
