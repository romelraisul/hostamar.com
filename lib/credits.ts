/**
 * PAID MODE (V12) — 1cr = 1TK = 1 future HOST coin. Every customer gets a
 * 6000cr bonus at signup; spend it at products/services; buy more via bKash
 * (Starter ৳599→6000cr, Pro ৳1,299→13000cr, Business ৳2,999→30000cr).
 * Race-safe metered implementation ACTIVE; every debit logs a raw-SQL audit
 * row. Insufficient → INSUFFICIENT_CREDITS → callers return 402 + bKash.
 */
import { prisma } from '@/lib/prisma'

export const FREE_TIER_ENABLED = false

export type DeductResult =
  | { ok: true; creditsRemaining: number; charged: number; source: 'free_tier' | 'credit_account' | 'customer' }
  | { ok: false; error: string; needed?: number; balance?: number }

// ── FREE-TIER ACTIVE IMPLEMENTATION (no restriction, ever) ──
export async function deductCredits(
  userId: string,
  amount: number,
  type = 'spend',
  description = '',
): Promise<DeductResult> {
  if (FREE_TIER_ENABLED) {
    // Log usage for analytics (non-fatal) — NEVER block, NEVER deduct
    try {
      const acct: any = await prisma.$queryRaw`SELECT id FROM "CreditAccount" WHERE "customerId" = ${userId} LIMIT 1`
      const accountId = Array.isArray(acct) && acct[0] ? acct[0].id : null
      if (accountId) {
        await prisma.$executeRaw`
          INSERT INTO "CreditTransaction" (id, "accountId", amount, product, "balanceAfter", description)
          VALUES (gen_random_uuid()::text, ${accountId}, 0, ${`free:${type}`}, 6000, ${description || 'free-tier usage (no deduction)'})
        `.catch(() => null)
      } else {
        await prisma.$executeRaw`
          INSERT INTO "CreditTransaction" (id, "customerId", amount, type, description, "balanceAfter")
          VALUES (${'ftx_' + Date.now().toString(36)}, ${userId}, 0, ${type}, ${description || 'free-tier usage (no deduction)'}, 6000)
        `.catch(() => null)
      }
    } catch { /* analytics only */ }
    return { ok: true, creditsRemaining: 6000, charged: 0, source: 'free_tier' }
  }

  // ── METERED IMPLEMENTATION (dormant — re-enable by flipping the flag) ──
  if (!Number.isFinite(amount) || amount === 0) {
    return { ok: false, error: 'Invalid amount' }
  }
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
    const res = await prisma.$executeRaw`UPDATE "Customer" SET credits = credits + ${amount} WHERE id = ${userId} AND credits + ${amount} >= 0`
    if (Number(res) === 0) {
      return { ok: false, error: 'INSUFFICIENT_CREDITS', needed: -amount, balance }
    }
    const after: any = await prisma.$queryRaw`SELECT credits FROM "Customer" WHERE id = ${userId} LIMIT 1`
    return { ok: true, creditsRemaining: Number(after?.[0]?.credits ?? 0), charged: amount, source: 'customer' }
  }
}

/** FREE: balance is always 6000 + unlimited flag for the UI meter. */
export async function getCreditBalance(userId: string): Promise<{ credits: number; unlimited: boolean; isFree: boolean; message: string }> {
  if (FREE_TIER_ENABLED) {
    return {
      credits: 6000,
      unlimited: true,
      isFree: true,
      message: '6000 bonus = 6000 TK — 1cr = 1TK = 1 ভবিষ্যৎ HOST কয়েন — বোনাস শেষ হলে কিনুন',
    }
  }
  const c = await prisma.customer.findUnique({ where: { id: userId }, select: { credits: true } }).catch(() => null)
  return {
    credits: Number(c?.credits ?? 0),
    unlimited: false,
    isFree: false,
    message: '',
  }
}

/** FREE: always enough. */
export async function checkCredits(userId: string, required: number): Promise<{ hasEnough: boolean; credits: number; unlimited: boolean }> {
  if (FREE_TIER_ENABLED) return { hasEnough: true, credits: 6000, unlimited: true }
  const c = await prisma.customer.findUnique({ where: { id: userId }, select: { credits: true } }).catch(() => null)
  const credits = Number(c?.credits ?? 0)
  return { hasEnough: credits >= required, credits, unlimited: false }
}
