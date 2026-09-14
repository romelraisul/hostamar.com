/**
 * budget-governor.ts — V8 Phase B. Daily spend cap per customer.
 * Ground truth: metered mode (FREE_TIER_ENABLED=false); spends are NEGATIVE
 * amounts on CreditTransaction, keyed by customerId OR accountId (prod shape
 * drift — CreditAccount rows use accountId/product, see lib/credits.ts).
 * Read-only: never mutates balances. Over-budget → heartbeat pauses for that
 * user, chat stays alive.
 */
import prisma from '@/lib/prisma'

export const DAILY_SPEND_CAP = 500

export async function dailySpend(customerId: string): Promise<number> {
  try {
    const acct: any[] = await prisma.$queryRaw`SELECT id FROM "CreditAccount" WHERE "customerId" = ${customerId} LIMIT 1`
    const accountId = Array.isArray(acct) && acct[0] ? acct[0].id : null
    let spend = 0
    const byCust: any[] = await prisma.$queryRaw`
      SELECT COALESCE(-SUM(amount),0)::int AS s FROM "CreditTransaction"
      WHERE "customerId" = ${customerId} AND amount < 0 AND "createdAt" >= date_trunc('day', now())`
    if (Array.isArray(byCust) && byCust[0]) spend += Number(byCust[0].s || 0)
    if (accountId) {
      const byAcct: any[] = await prisma.$queryRaw`
        SELECT COALESCE(-SUM(amount),0)::int AS s FROM "CreditTransaction"
        WHERE "accountId" = ${accountId} AND amount < 0 AND "createdAt" >= date_trunc('day', now())`
      if (Array.isArray(byAcct) && byAcct[0]) spend += Number(byAcct[0].s || 0)
    }
    return spend
  } catch { return 0 }
}

export async function isOverBudget(customerId: string, cap = DAILY_SPEND_CAP): Promise<{ over: boolean; spend: number; cap: number }> {
  const spend = await dailySpend(customerId)
  return { over: spend > cap, spend, cap }
}
