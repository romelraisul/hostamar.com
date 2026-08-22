/**
 * lib/affiliate.ts — Affiliate program engine (2026).
 * 20% recurring commission on referred customers' payments.
 * Builds on Customer.referralCode + Referral model (already exist).
 */
import { prisma } from '@/lib/prisma'
import { ensureSchema } from '@/lib/ensure-schema'

export const AFFILIATE_COMMISSION_RATE = 0.20 // 20%

/** Get or create the affiliate (referral) code for a customer. */
export async function getOrCreateAffiliateCode(customerId: string): Promise<string> {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } })
  if (!customer) throw new Error('Customer not found')
  if (customer.referralCode) return customer.referralCode

  const code = 'HST' + customerId.slice(-6).toUpperCase()
  await prisma.customer.update({ where: { id: customerId }, data: { referralCode: code } })
  return code
}

/** Find the affiliate (referrer) for a given customer, via the Referral link. */
export async function findAffiliateForCustomer(customerId: string): Promise<string | null> {
  const referral = await prisma.referral.findFirst({
    where: { referredId: customerId },
    orderBy: { createdAt: 'asc' },
  })
  return referral?.referrerId || null
}

/**
 * Record a commission when a referred customer pays.
 * Called from the payment-verification flow (grantPaymentBenefits).
 * Idempotent per (sourceId, affiliateId).
 */
export async function recordAffiliateCommission(opts: {
  fromCustomerId: string
  amount: number // payment amount in BDT
  sourceType: 'PAYMENT' | 'SUBSCRIPTION_RENEWAL'
  sourceId?: string
}): Promise<{ created: boolean; commissionId?: string; amount?: number }> {
  await ensureSchema()

  const affiliateId = await findAffiliateForCustomer(opts.fromCustomerId)
  if (!affiliateId) return { created: false } // not referred — no commission

  // Idempotency: skip if already recorded for this source
  if (opts.sourceId) {
    const existing = await prisma.affiliateCommission.findFirst({
      where: { sourceId: opts.sourceId, affiliateId },
    })
    if (existing) return { created: false, commissionId: existing.id }
  }

  const commissionAmount = Math.round(opts.amount * AFFILIATE_COMMISSION_RATE * 100) / 100
  if (commissionAmount <= 0) return { created: false }

  const commission = await prisma.affiliateCommission.create({
    data: {
      affiliateId,
      fromCustomerId: opts.fromCustomerId,
      sourceType: opts.sourceType,
      sourceId: opts.sourceId || null,
      amount: commissionAmount,
      rate: AFFILIATE_COMMISSION_RATE,
      status: 'PENDING',
    },
  })

  return { created: true, commissionId: commission.id, amount: commissionAmount }
}

/** Aggregate earnings for an affiliate. */
export async function getAffiliateEarnings(customerId: string) {
  await ensureSchema()
  const [commissions, referralCount] = await Promise.all([
    prisma.affiliateCommission.findMany({
      where: { affiliateId: customerId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.referral.count({ where: { referrerId: customerId } }),
  ])

  const total = commissions.reduce((s, c) => s + c.amount, 0)
  const pending = commissions.filter((c) => c.status === 'PENDING').reduce((s, c) => s + c.amount, 0)
  const paid = commissions.filter((c) => c.status === 'PAID').reduce((s, c) => s + c.amount, 0)

  return {
    referralCount,
    totalEarnings: Math.round(total * 100) / 100,
    pending: Math.round(pending * 100) / 100,
    paid: Math.round(paid * 100) / 100,
    commissionRate: AFFILIATE_COMMISSION_RATE,
    commissions: commissions.slice(0, 50).map((c) => ({
      id: c.id,
      amount: c.amount,
      status: c.status,
      sourceType: c.sourceType,
      createdAt: c.createdAt,
    })),
  }
}
