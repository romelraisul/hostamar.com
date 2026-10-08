export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getCreditBalance } from '@/lib/credits'
import { prisma } from '@/lib/prisma'
import { PAYMENT_PLANS } from '@/lib/pricing'

/**
 * GET /api/dashboard/credits — real balance + real usage history.
 * 1cr = 1TK = 1 future HOST coin. Every number here comes from the ledger
 * (CreditTransaction) — nothing is derived from a hardcoded 6000 baseline, so
 * a customer who tops up to 30000cr does not see "used: 0".
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bal = await getCreditBalance(user.id)

  const [sums, history] = await Promise.all([
    prisma
      .$queryRaw`
        SELECT
          COALESCE(SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END), 0) AS spent,
          COALESCE(SUM(CASE WHEN amount > 0 THEN  amount ELSE 0 END), 0) AS earned
        FROM "CreditTransaction" WHERE "customerId" = ${user.id}
      `
      .catch(() => [{ spent: 0, earned: 0 }] as any),
    prisma
      .$queryRaw`
        SELECT id, amount, type, description, "balanceAfter", "createdAt"
        FROM "CreditTransaction" WHERE "customerId" = ${user.id}
        ORDER BY "createdAt" DESC LIMIT 20
      `
      .catch(() => [] as any),
  ])

  const spent = Number((sums as any)?.[0]?.spent ?? 0)
  const earned = Number((sums as any)?.[0]?.earned ?? 0)
  const lifetime = spent + Math.max(0, bal.credits)
  const percent = lifetime > 0 ? Math.min(100, Math.max(0, Math.round((spent / lifetime) * 100))) : 0

  return NextResponse.json({
    credits: bal.credits,
    spent,
    earned,
    percent,
    isFree: bal.isFree,
    unlimited: bal.unlimited,
    welcome: 6000,
    costs: { video: 'market 100-5000cr', chat: 'token price per model', browser: '5cr/hr', ide: '10cr/hr', game: '20cr/hr', chatos: '1cr/action' },
    message: bal.message,
    bKash: '01822417463',
    topUp: '/payment',
    history: (Array.isArray(history) ? history : []).map((r: any) => ({
      id: String(r.id),
      amount: Number(r.amount),
      type: String(r.type || ''),
      description: r.description ?? '',
      balanceAfter: Number(r.balanceAfter ?? 0),
      createdAt: r.createdAt,
    })),
    plans: { Starter: `${PAYMENT_PLANS.starter.price}TK → ${PAYMENT_PLANS.starter.credits}cr`, Pro: `${PAYMENT_PLANS.pro.price}TK → ${PAYMENT_PLANS.pro.credits}cr`, Business: `${PAYMENT_PLANS.business.price}TK → ${PAYMENT_PLANS.business.credits}cr` },
  })
}
