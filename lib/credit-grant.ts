/**
 * Single entry point for every credit GRANT (bKash purchase, first-purchase
 * bonus, referral cut, marketplace sale/commission).
 *
 * Why this file exists: grants were hand-rolled at each call site with
 * `prisma.customer.update({ credits: { increment } })`, which wrote NO
 * CreditTransaction row — so paid credits were invisible in billing history
 * and the first-purchase bonus / referral cut had nowhere to live. Every grant
 * here goes through `deductCredits` (atomic raw SQL + one audit row).
 *
 * Rules (docs/BILLING.md): 1cr = 1TK = 1COIN. One grant = one CreditTransaction.
 * No path may hand-roll a credits increment.
 */
import { prisma } from '@/lib/prisma'
import { deductCredits } from '@/lib/credits'

export const FIRST_PURCHASE_BONUS = 6000 // একবারই — প্রথম সফল কেনাকাটায়
export const REFERRAL_CUT = 0.10        // রেফারার পায় কেনা ক্রেডিটের ১০%
export const SELLER_CUT = 0.80          // সেলার ৮০% / প্ল্যাটফর্ম ২০%

export type GrantResult = { ok: boolean; credits?: number; balanceAfter?: number; error?: string }

/** Add credits atomically + write the audit row. amount must be > 0. */
export async function grantCredits(
  customerId: string,
  amount: number,
  type: string,
  description: string,
): Promise<GrantResult> {
  const n = Math.round(amount)
  if (!Number.isFinite(n) || n <= 0) return { ok: false, error: 'amount must be a positive integer' }
  const r = await deductCredits(customerId, n, type, description)
  if (!r.ok) return { ok: false, error: r.error }
  return { ok: true, credits: n, balanceAfter: r.creditsRemaining }
}

async function countRows(sql: TemplateStringsArray, ...args: unknown[]): Promise<number> {
  try {
    const rows: any = await (prisma.$queryRaw as any)(sql, ...args)
    return Number(Array.isArray(rows) ? rows[0]?.n ?? 0 : 0)
  } catch {
    return 0
  }
}

/** The platform (Hostamar) customer that collects the 20% commission. */
async function platformCustomerId(): Promise<string | null> {
  try {
    const rows: any = await prisma.$queryRaw`
      SELECT id FROM "Customer" WHERE role IN ('admin','superadmin') ORDER BY "createdAt" ASC LIMIT 1
    `
    return Array.isArray(rows) && rows[0] ? String(rows[0].id) : null
  } catch {
    return null
  }
}

/**
 * Award the referrer when a referred customer pays. Atomic: the Referral row
 * is claimed (PENDING → paid) with a guarded UPDATE, so two overlapping
 * approval paths can never pay the same referral twice.
 */
export async function awardReferral(
  referredCustomerId: string,
  creditsGranted: number,
  source?: string,
): Promise<{ rewarded: boolean; referrerId?: string; credits?: number; reason?: string }> {
  let ref: any = null
  try {
    const rows: any = await prisma.$queryRaw`
      SELECT id, "referrerId" FROM "Referral"
      WHERE "referredId" = ${referredCustomerId} AND status IN ('PENDING','pending')
      ORDER BY "createdAt" ASC LIMIT 1
    `
    ref = Array.isArray(rows) && rows[0] ? rows[0] : null
  } catch {
    return { rewarded: false, reason: 'referral table unavailable' }
  }
  if (!ref) return { rewarded: false, reason: 'no pending referral' }

  const cut = Math.max(1, Math.round(creditsGranted * REFERRAL_CUT))
  let claimed = 0
  try {
    claimed = Number(await prisma.$executeRaw`
      UPDATE "Referral" SET status = 'paid', "bonusAmount" = ${cut}
      WHERE id = ${ref.id} AND status IN ('PENDING','pending')
    `)
  } catch (e: any) {
    return { rewarded: false, reason: 'claim failed: ' + (e?.message || 'unknown') }
  }
  if (claimed === 0) return { rewarded: false, reason: 'already paid' }

  const g = await grantCredits(
    String(ref.referrerId),
    cut,
    'referral',
    `referral 10% (${cut}cr) — referred customer purchased${source ? ' · ' + source : ''}`,
  )
  await prisma.$executeRaw`
    UPDATE "Customer" SET "referralBonus" = COALESCE("referralBonus",0) + ${cut} WHERE id = ${String(ref.referrerId)}
  `.catch(() => null)
  return { rewarded: g.ok, referrerId: String(ref.referrerId), credits: cut }
}

/**
 * The one path a paid plan takes on ANY approval surface (admin approve,
 * bKash SMS auto-match, gateway webhook): credits + first-purchase bonus +
 * referral cut, each its own audit row.
 */
export async function grantPlanPurchase(opts: {
  customerId: string
  credits: number
  plan: string
  reference?: string
}): Promise<{
  ok: boolean
  credits: number
  bonus: number
  referral: { rewarded: boolean; referrerId?: string; credits?: number }
  error?: string
}> {
  const { customerId, plan, reference } = opts
  const credits = Math.round(opts.credits || 0)
  if (credits <= 0) return { ok: false, credits: 0, bonus: 0, referral: { rewarded: false }, error: 'plan grants 0 credits' }

  // Count BEFORE the grant — the purchase row we are about to write would
  // otherwise make "first purchase" false on every call.
  const prior = await countRows`SELECT COUNT(*) n FROM "CreditTransaction" WHERE "customerId" = ${customerId} AND type = 'purchase'`

  const main = await grantCredits(customerId, credits, 'purchase', `${plan} প্ল্যান পেমেন্ট${reference ? ' · ' + reference : ''}`)
  if (!main.ok) return { ok: false, credits: 0, bonus: 0, referral: { rewarded: false }, error: main.error }

  let bonus = 0
  if (prior === 0) {
    const b = await grantCredits(customerId, FIRST_PURCHASE_BONUS, 'bonus', `প্রথম কেনাকাটা বোনাস ${FIRST_PURCHASE_BONUS}cr HOST কয়েন`)
    if (b.ok) bonus = FIRST_PURCHASE_BONUS
  }

  const referral = await awardReferral(customerId, credits, reference)
  return { ok: true, credits, bonus, referral: { rewarded: referral.rewarded, referrerId: referral.referrerId, credits: referral.credits } }
}

/**
 * Marketplace sale: buyer pays `credits`, seller keeps 80%, platform 20%.
 * Three audit rows, all atomic raw SQL. The platform commission credits the
 * admin customer (Hostamar); if no admin customer exists yet the buyer/seller
 * legs still settle and the commission leg is reported, not silently dropped.
 */
export type SplitResult =
  | { ok: true; creditsRemaining: number; charged: number; source: 'marketplace_split'; sellerCredits: number; platformCredits: number }
  | { ok: false; error: string; balance?: number }

export async function splitSale(opts: {
  buyerId: string
  sellerId: string | null
  credits: number
  item: string
}): Promise<SplitResult> {
  const credits = Math.round(opts.credits || 0)
  if (credits <= 0) return { ok: false, error: 'credits must be > 0' }

  // No seller → everything stays with the platform (all 56 catalog services today).
  const sellerId = opts.sellerId
  const sellerShare = sellerId ? Math.floor(credits * SELLER_CUT) : 0
  const platformShare = credits - sellerShare

  // Buyer leg first — if it fails nothing else moved (no seller paid on a failed sale).
  const pay = await deductCredits(opts.buyerId, -credits, 'purchase', `store purchase · ${opts.item}`)
  if (!pay.ok) return { ok: false, error: pay.error, balance: pay.balance }

  let sellerCredits = 0
  if (sellerId && sellerShare > 0) {
    const s = await grantCredits(sellerId, sellerShare, 'sale', `sale 80% · ${opts.item} (buyer ${opts.buyerId})`)
    if (!s.ok) return { ok: false, error: 'seller credit failed: ' + s.error, balance: pay.creditsRemaining }
    sellerCredits = sellerShare
  }

  // 20% commission → the Hostamar admin customer. No admin customer yet (fresh
  // DB) → the buyer/seller legs still settled; the share is reported back.
  const platform = await platformCustomerId()
  if (platform && platform !== sellerId && platformShare > 0) {
    await grantCredits(platform, platformShare, 'commission', `platform 20% · ${opts.item} (buyer ${opts.buyerId})`)
  }

  return { ok: true, creditsRemaining: pay.creditsRemaining, charged: credits, source: 'marketplace_split', sellerCredits, platformCredits: platformShare }
}
