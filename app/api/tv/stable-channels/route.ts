export const dynamic = 'force-dynamic'

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
  const country = searchParams.get('country') || 'bd'

  try {
    const db = await getTursoEdgeClient()

    // Try to get stable channels - handle missing tables gracefully
    let items: any[] = []
    
    try {
      const countRes = await db.execute('SELECT COUNT(*) as cnt FROM "TvChannelStability"')
      const count = (countRes.rows[0]?.cnt as number) || 0

      if (count > 0) {
        const rowsRes = await db.execute({
          sql: 'SELECT "channelId", "stabilityScore", "popularityScore" FROM "TvChannelStability" WHERE "stabilityScore" > 0 ORDER BY "stabilityScore" DESC, "popularityScore" DESC LIMIT ?',
          args: [limit]
        })
        const rows = rowsRes.rows as unknown as StabilityRow[]

        if (rows.length > 0) {
          const channelIds = rows.map((r) => r.channelId)
          const placeholders = channelIds.map(() => '?').join(',')
          const channelsRes = await db.execute({
            sql: `SELECT "id", "name", "url", "logo", "category", "country", "views" FROM "TvIptvChannel" WHERE "id" IN (${placeholders})`,
            args: channelIds
          })
          const byId: Map<string, ChannelRow> = new Map(
            (channelsRes.rows as unknown as ChannelRow[]).map((c) => [c.id, c])
          )

          items = rows
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
        }
      }
    } catch {}

    // Fallback: return top channels from TvIptvChannel directly
    if (items.length === 0) {
      try {
        const fallbackRes = await db.execute({
          sql: 'SELECT "id", "name", "url", "logo", "category", "country", "views" FROM "TvIptvChannel" WHERE "country" = ? AND "url" LIKE ? AND "logo" IS NOT NULL ORDER BY "views" DESC LIMIT ?',
          args: [country, '%.m3u8%', limit]
        })
        items = (fallbackRes.rows as unknown as ChannelRow[]).map((c) => ({
          id: c.id, title: c.name, url: c.url, logo: c.logo, category: c.category,
          country: c.country, source: 'iptv-fallback', stabilityScore: 50, popularityScore: c.views
        }))
      } catch {}
    }

    // Final fallback: return empty array (never 500)
    return NextResponse.json({ ok: true, total: items.length, items })
  } catch (e: any) {
    return NextResponse.json({ ok: true, total: 0, items: [] })
  }
}
