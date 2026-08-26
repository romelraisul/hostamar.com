import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 10
export const runtime = 'nodejs'

/**
 * GET /api/admin/market-trends
 * Lists the most recent MarketTrend rows (admin only).
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rows = await prisma.$queryRaw`
    SELECT id, service, "oldPrice", "newPrice", "driftPct", source, status, "createdAt"
    FROM "MarketTrend"
    ORDER BY "createdAt" DESC LIMIT 20`
  return Response.json({ trends: rows })
}
