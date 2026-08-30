export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 55

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { explainAnalytics } from '@/lib/model-in-every-point'

/**
 * GET /api/dashboard/insight — model-generated Bangla explanation of the
 * user's dashboard numbers. Split OUT of /api/dashboard/stats (v5): the LLM
 * takes 15-35s on the free chain and was blocking the whole stats response —
 * the client loads this lazily AFTER the dashboard has painted.
 */
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser(req)
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [videoCount, customer] = await Promise.all([
    prisma.video.count({ where: { customerId: authUser.id } }).catch(() => 0),
    prisma.customer.findUnique({ where: { id: authUser.id }, select: { credits: true } }).catch(() => null),
  ])

  // STRICT CREDIT (v9): insight costs 2cr — race-safe deduct, 402 if short.
  const cust = await prisma.customer.findUnique({ where: { id: authUser.id }, select: { credits: true } }).catch(() => null)
  const bal = Number(cust?.credits ?? 0)
  if (bal < 2) {
    return NextResponse.json({ error: 'INSUFFICIENT_CREDITS', needed: 2, balance: bal, bkash: '01822417463' }, { status: 402 })
  }
  const dec: any = await prisma.$executeRaw`UPDATE "Customer" SET credits = credits - 2 WHERE id = ${authUser.id} AND credits >= 2`
  if (Number(dec) === 0) {
    return NextResponse.json({ error: 'INSUFFICIENT_CREDITS', needed: 2, balance: bal, bkash: '01822417463' }, { status: 402 })
  }

  const insight = await explainAnalytics({
    videos: videoCount,
    credits: Number(customer?.credits ?? 0),
  }).catch(() => '')

  return NextResponse.json({ insight: insight || null })
}
