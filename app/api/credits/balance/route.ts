import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { chatRateFor } from '@/lib/pricing'
import { getBinanceRate } from '@/lib/binance'

export const dynamic = 'force-dynamic'
export const maxDuration = 10
export const runtime = 'nodejs' // Vercel hobby cap

/**
 * GET /api/credits/balance — current credit balance + optional USD conversion.
 * Looks up via CreditAccount first (real prod table), falls back to Customer.credits.
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Try CreditAccount first (real prod model)
  let credits = 0
  let source: 'credit_account' | 'customer' = 'credit_account'
  try {
    const acct: any = await prisma.$queryRaw`SELECT credits FROM "CreditAccount" WHERE "customerId" = ${user.id} LIMIT 1`
    if (Array.isArray(acct) && acct[0] && acct[0].credits != null) {
      credits = Number(acct[0].credits)
    } else {
      source = 'customer'
      const c = await prisma.customer.findUnique({ where: { id: user.id }, select: { credits: true } })
      credits = c?.credits ?? 0
    }
  } catch {
    const c = await prisma.customer.findUnique({ where: { id: user.id }, select: { credits: true } })
    credits = c?.credits ?? 0
    source = 'customer'
  }

  const rate = await getBinanceRate()
  return Response.json({
    balance: { credits, usd: Math.round((credits / rate.usdtBdt) * 100) / 100 },
    usdtBdt: rate.usdtBdt,
    source,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
