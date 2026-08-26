import { prisma } from '@/lib/prisma'

export type DeductResult =
  | { ok: true; creditsRemaining: number; charged: number; source: 'credit_account' | 'customer' }
  | { ok: false; error: string; needed?: number; balance?: number }

/**
 * Race-safe credit deduction — shared by /api/credits/deduct AND /api/chat
 * so the chat route doesn't rely on an internal HTTP call to the deduct route.
 * Writes audit row in the REAL prod shape (accountId + product). For legacy
 * Customer.credits accounts (no CreditAccount), deduction happens but audit
 * row is skipped because prod CreditTransaction requires accountId.
 */
export async function deductCredits(
  userId: string,
  amount: number,
  type: string,
  description: string,
): Promise<DeductResult> {
  if (!Number.isFinite(amount) || amount === 0) {
    return { ok: false, error: 'Invalid amount' }
  }

  // Resolve CreditAccount (real prod model) first.
  const acct: any = await prisma.$queryRaw`SELECT id, credits FROM "CreditAccount" WHERE "customerId" = ${userId} LIMIT 1`
  const accountId: string | null = Array.isArray(acct) && acct[0] ? acct[0].id : null
  const balance = accountId ? Number(acct[0].credits || 0) : (await prisma.customer.findUnique({ where: { id: userId }, select: { credits: true } }))?.credits ?? 0

  if (amount < 0 && balance < -amount) {
    return { ok: false, error: 'INSUFFICIENT_CREDITS', needed: -amount, balance }
  }

  if (accountId) {
    const res = await prisma.$executeRaw`UPDATE "CreditAccount" SET credits = credits + ${amount} WHERE id = ${accountId} AND credits + ${amount} >= 0`
    if (Number(res) === 0) {
      return { ok: false, error: 'INSUFFICIENT_CREDITS', needed: -amount, balance }
    }
    await prisma.$executeRaw`
      INSERT INTO "CreditTransaction" (id, "accountId", amount, product, "balanceAfter", description)
      VALUES (gen_random_uuid()::text, ${accountId}, ${amount}, ${type},
              (SELECT credits FROM "CreditAccount" WHERE id = ${accountId}), ${description})
    `.catch(() => null)
    const after: any = await prisma.$queryRaw`SELECT credits FROM "CreditAccount" WHERE id = ${accountId} LIMIT 1`
    return { ok: true, creditsRemaining: Number(after?.[0]?.credits ?? 0), charged: amount, source: 'credit_account' }
  } else {
    // Legacy path: Customer.credits column (no audit row — prod table requires accountId).
    const res = await prisma.$executeRaw`UPDATE "Customer" SET credits = credits + ${amount} WHERE id = ${userId} AND credits + ${amount} >= 0`
    if (Number(res) === 0) {
      return { ok: false, error: 'INSUFFICIENT_CREDITS', needed: -amount, balance }
    }
    const after: any = await prisma.$queryRaw`SELECT credits FROM "Customer" WHERE id = ${userId} LIMIT 1`
    return { ok: true, creditsRemaining: Number(after?.[0]?.credits ?? 0), charged: amount, source: 'customer' }
  }
}
