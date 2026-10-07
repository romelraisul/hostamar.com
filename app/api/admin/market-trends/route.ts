import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 10

/**
 * GET /api/admin/market-trends
 * Lists the most recent MarketTrend rows (admin only).
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const rows = await prisma.$queryRaw`
      SELECT id, service, "oldPrice", "newPrice", "driftPct", source, status, "createdAt"
      FROM "MarketTrend"
      ORDER BY "createdAt" DESC LIMIT 20`
    return Response.json({ trends: rows })
  } catch (e: any) {
    // ponytail: table is created by the first /api/cron/market-sync run; before
    // that (and on a fresh DB) this is "no drift yet", not an error.
    console.warn('[market-trends] read failed', e?.message?.slice(0, 200))
    return Response.json({ trends: [] })
  }
}
