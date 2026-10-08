import { prisma } from '@/lib/prisma'
import { awardReferral } from '@/lib/credit-grant'

export const REFERRAL_CREDITS = 500
export const REFERRAL_TAKA_STARTER = 60 // 10% of 600? spec: 10% Taka commission (60 for starter)
export const REFERRAL_CODE_LEN = 6

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I,O,0,1 confusion

export function generateReferralCode(): string {
  let s = ''
  for (let i = 0; i < REFERRAL_CODE_LEN; i++) s += CHARS[Math.floor(Math.random() * CHARS.length)]
  return s
}

/** Get or create 6-char referralCode for a customer */
export async function getOrCreateReferralCode(customerId: string): Promise<string> {
  const c = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true, referralCode: true } })
  if (!c) throw new Error('Customer not found')
  if (c.referralCode) return c.referralCode
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateReferralCode()
    try {
      const updated = await prisma.customer.update({ where: { id: customerId }, data: { referralCode: code } })
      return updated.referralCode!
    } catch (e: any) {
      if (String(e.message).includes('Unique') || String(e.code) === 'P2002') continue
      throw e
    }
  }
  // fallback: id slice
  const fb = 'H' + customerId.slice(-5).toUpperCase().replace(/[^A-Z0-9]/g, 'X')
  await prisma.customer.update({ where: { id: customerId }, data: { referralCode: fb } })
  return fb
}

export function referralLinkFor(code: string): string {
  // spec: https://hostamar.com/?ref=ABC123  (homepage ?ref)
  return `https://hostamar.com/?ref=${code}`
}

/** Commission table 10% logic */
export function takaCommissionFor(amountBDT: number): number {
  // spec: 10% Taka commission, 60 for starter (starter ~600 BDT)
  // compute 10% rounded, min 0
  return Math.round(amountBDT * 0.10)
}

/** Reward the referrer on the referred user's first successful payment.
 *  Delegates to lib/credit-grant.awardReferral — one atomic claim of the
 *  PENDING Referral row (so overlapping approval paths can't double-pay) and
 *  one credit grant with a real audit row (the old Customer.credits increment
 *  wrote no CreditTransaction, so referral payouts were untraceable).
 *  Cut = 10% of the purchased credits (1cr = 1TK).
 */
export async function rewardReferrerOnPayment(
  referredCustomerId: string,
  paymentAmountBD: number,
  sourceId?: string,
): Promise<{ rewarded: boolean; referrerId?: string }> {
  const credits = Math.round(paymentAmountBD) || REFERRAL_CREDITS
  const r = await awardReferral(referredCustomerId, credits, sourceId ? `payment ${sourceId}` : undefined)
  return { rewarded: r.rewarded, referrerId: r.referrerId }
}

/** Aggregate for dashboard */
export async function getReferralStats(customerId: string) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { referralCode: true, id: true } })
  if (!customer) throw new Error('Unauthorized')
  const code = customer.referralCode || await getOrCreateReferralCode(customerId)
  const referrals = await prisma.referral.findMany({
    where: { referrerId: customerId },
    include: { referred: { select: { name: true, email: true, createdAt: true } } },
    orderBy: { createdAt: 'desc' },
  })
  const total = referrals.length
  // support both PENDING/pending and PAID/paid etc
  const paid = referrals.filter(r => ['PAID','paid','COMPLETED','completed'].includes(r.status)).length
  const pending = referrals.filter(r => ['PENDING','pending'].includes(r.status)).length
  const earnedCredits = paid * REFERRAL_CREDITS
  const earnedTaka = referrals.filter(r => ['PAID','paid','COMPLETED'].includes(r.status)).reduce((s, r) => s + (r.bonusAmount || 0), 0)
  return {
    referralCode: code,
    referralLink: referralLinkFor(code),
    totalReferrals: total,
    paidCount: paid,
    pendingCount: pending,
    earnedCredits,
    earnedTaka,
    referrals: referrals.map(r => ({
      id: r.id,
      name: r.referred.name,
      email: r.referred.email,
      status: r.status,
      bonusAmount: r.bonusAmount,
      createdAt: r.createdAt,
    })),
  }
}
