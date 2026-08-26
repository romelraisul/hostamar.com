import { prisma } from '@/lib/prisma'

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

/** Reward referrer on first successful payment of referred user.
 *  Idempotent: only rewards if Referral.status is PENDING, then sets to PAID.
 *  Credits 500cr via CreditTransaction + Taka commission via Referral.bonusAmount update.
 */
export async function rewardReferrerOnPayment(referredCustomerId: string, paymentAmountBD: number, sourceId?: string): Promise<{ rewarded: boolean; referrerId?: string }> {
  // find pending referral for this referred user
  const ref = await prisma.referral.findFirst({
    where: { referredId: referredCustomerId, status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
  })
  if (!ref) {
    // also check lowercase pending (task spec uses "pending")
    const ref2 = await prisma.referral.findFirst({
      where: { referredId: referredCustomerId, status: 'pending' },
      orderBy: { createdAt: 'asc' },
    })
    if (!ref2) return { rewarded: false }
    return rewardOne(ref2, paymentAmountBD, sourceId)
  }
  return rewardOne(ref, paymentAmountBD, sourceId)
}

async function rewardOne(ref: any, paymentAmountBD: number, sourceId?: string): Promise<{ rewarded: boolean; referrerId?: string }> {
  const commission = takaCommissionFor(paymentAmountBD) || REFERRAL_TAKA_STARTER
  // update referral to paid + update bonusAmount to commission
  await prisma.referral.update({
    where: { id: ref.id },
    data: { status: 'paid', bonusAmount: commission },
  }).catch(async () => {
    // fallback for uppercase PENDING case: status PAID
    await prisma.referral.update({ where: { id: ref.id }, data: { status: 'PAID', bonusAmount: commission } })
  })

  // credit 500cr to referrer
  const referrerId = ref.referrerId
  try {
    // try CreditAccount path first
    const acct: any = await prisma.$queryRaw`SELECT id, credits FROM "CreditAccount" WHERE "customerId" = ${referrerId} LIMIT 1`
    const accountId: string | null = Array.isArray(acct) && acct[0] ? acct[0].id : null
    if (accountId) {
      await prisma.$executeRaw`UPDATE "CreditAccount" SET credits = credits + ${REFERRAL_CREDITS} WHERE id = ${accountId}`
      await prisma.$executeRaw`INSERT INTO "CreditTransaction" (id, "accountId", amount, product, "balanceAfter", description) VALUES (gen_random_uuid()::text, ${accountId}, ${REFERRAL_CREDITS}, 'referral_bonus', (SELECT credits FROM "CreditAccount" WHERE id = ${accountId}), ${'Referral bonus: 500cr for ' + ref.referredId + (sourceId ? ' payment ' + sourceId : '')})`
      // also keep Customer.credits in sync
      await prisma.customer.update({ where: { id: referrerId }, data: { credits: { increment: REFERRAL_CREDITS } } }).catch(() => {})
    } else {
      // legacy Customer.credits path + try typed create
      await prisma.customer.update({ where: { id: referrerId }, data: { credits: { increment: REFERRAL_CREDITS } } })
      const after = await prisma.customer.findUnique({ where: { id: referrerId }, select: { credits: true } })
      await prisma.creditTransaction.create({
        data: {
          customerId: referrerId,
          amount: REFERRAL_CREDITS,
          type: 'referral_bonus',
          description: `Referral bonus 500cr for referred ${ref.referredId}`,
          balanceAfter: Math.round(after?.credits || 0),
        },
      }).catch(() => {})
    }
    // also increase referrer's balance (Taka commission) if we track it — increment Customer.balance
    if (commission > 0) {
      await prisma.customer.update({ where: { id: referrerId }, data: { balance: { increment: commission } } }).catch(() => {})
    }
  } catch (e) {
    console.warn('[referral] credit failed', e)
  }

  // also create affiliate commission record for consistency (20% engine exists, but our spec uses 10%) — keep both
  try {
    const { recordAffiliateCommission } = await import('@/lib/affiliate')
    await recordAffiliateCommission({ fromCustomerId: ref.referredId, amount: paymentAmountBD, sourceType: 'PAYMENT', sourceId: sourceId || ref.id }).catch(() => {})
  } catch {}

  return { rewarded: true, referrerId }
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
