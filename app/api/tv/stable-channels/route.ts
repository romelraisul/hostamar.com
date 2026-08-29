export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PERF: DDL self-heal only once per serverless instance (was every request,
// adding ~3s across 4 CREATE TABLE roundtrips). Tables already exist in prod.
let schemaEnsured = false
async function ensureSchemaOnce() {
  if (schemaEnsured) return
  try { await (prisma as any).$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "TvChannelStability" ("id" TEXT PRIMARY KEY, "channelId" TEXT UNIQUE NOT NULL, "stabilityScore" INTEGER NOT NULL DEFAULT 0, "popularityScore" INTEGER NOT NULL DEFAULT 0, "successCount" INTEGER NOT NULL DEFAULT 0, "failCount" INTEGER NOT NULL DEFAULT 0, "avgLoadTimeMs" INTEGER NOT NULL DEFAULT 9999, "lastSuccessAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`) } catch {}
  try { await (prisma as any).$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TvChannelStability_stabilityScore_popularityScore_idx" ON "TvChannelStability"("stabilityScore" DESC, "popularityScore" DESC)`) } catch {}
  try { await (prisma as any).$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "TvAdClick" ("id" TEXT PRIMARY KEY, "adKey" TEXT NOT NULL, "adText" TEXT NOT NULL, "channelId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`) } catch {}
  try { await (prisma as any).$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TvAdClick_adKey_createdAt_idx" ON "TvAdClick"("adKey", "createdAt")`) } catch {}
  schemaEnsured = true
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
    // PERF: self-heal DDL once per instance, not per request
    await ensureSchemaOnce()

    // Auto-seed on first call: 50 BD channels with .m3u8 + logo
    const count = await prisma.tvChannelStability.count()
    if (count === 0) {
      const seed = await prisma.tvIptvChannel.findMany({
        where: {
          country,
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
      // Fallback: return top tvIptvChannel directly if stability table empty
      const fallback = await prisma.tvIptvChannel.findMany({
        where: { country, url: { contains: '.m3u8' }, logo: { not: null } },
        orderBy: [{ views: 'desc' }],
        take: limit,
        select: { id: true, name: true, url: true, logo: true, category: true, country: true, views: true },
      })
      const items = fallback.map((c) => ({
        id: c.id, title: c.name, url: c.url, logo: c.logo, category: c.category,
        country: c.country, source: 'iptv-fallback', stabilityScore: 50, popularityScore: c.views,
      }))
      return NextResponse.json({ ok: true, total: items.length, items })
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
