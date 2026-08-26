import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 10
export const runtime = 'nodejs'

/**
 * POST /api/admin/market-decide
 * Body: { id, action: 'approve' | 'reject' }
 * Approving applies the new price (writes to a DB PricingPlan table or logs
 * for manual update). Rejecting marks it rejected.
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body) return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  const id = String(body.id || '')
  const action = String(body.action || '')
  if (!id || !['approve', 'reject'].includes(action)) {
    return Response.json({ error: 'id + action required' }, { status: 400 })
  }

  if (action === 'approve') {
    // Fetch the trend
    const rows: any = await prisma.$queryRaw`SELECT * FROM "MarketTrend" WHERE id = ${id} LIMIT 1`
    const trend = rows?.[0]
    if (!trend) return Response.json({ error: 'Trend not found' }, { status: 404 })
    // Apply: status=applied, set appliedAt. The actual HOSTING_PLANS.ts update is
    // still a deploy — we record the approval here. (Phase 3 TODO: live price override table.)
    await prisma.$executeRaw`UPDATE "MarketTrend" SET status = 'applied', "appliedAt" = CURRENT_TIMESTAMP WHERE id = ${id}`
    return Response.json({ ok: true, applied: trend.newPrice, service: trend.service })
  } else {
    await prisma.$executeRaw`UPDATE "MarketTrend" SET status = 'rejected', "rejectedAt" = CURRENT_TIMESTAMP WHERE id = ${id}`
    return Response.json({ ok: true, rejected: true })
  }
}
