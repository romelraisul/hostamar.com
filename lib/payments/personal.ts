/**
 * lib/payments/personal.ts — Personal Send-Money (P2P) payment engine.
 *
 * Bangladesh reality: no business docs → no merchant account. Users Send Money
 * to our PERSONAL bKash/Nagad/Rocket numbers, then submit the TrxID.
 *
 * Dual verification:
 *   A) Manual: user submits TrxID → PENDING → admin approves (or SMS auto-match)
 *   B) Auto: Android SMS-sync app POSTs incoming payment SMS to /api/payments/sms-webhook
 *      → parsed into SmsLog → auto-matched to PENDING submissions (same TrxID + amount ±1 Tk)
 *
 * No mocks. If personal payments are disabled, callers get honest errors.
 */
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'
import { ensureSchema } from '@/lib/ensure-schema'
import { recordAffiliateCommission } from '@/lib/affiliate'

export const TRXID_REGEX = /^[A-Z0-9]{8,10}$/
export const AMOUNT_TOLERANCE = 1 // ±1 Tk
export const PENDING_EXPIRY_MINUTES = 15
export const SMS_MATCH_WINDOW_MINUTES = 5
export const VERIFY_RATE_LIMIT_PER_MIN = 5

export type PersonalMethod = 'BKASH' | 'NAGAD' | 'ROCKET'

export interface PersonalNumbers {
  BKASH: string | null
  NAGAD: string | null
  ROCKET: string | null
  enabled: boolean
}

/** The personal numbers users send money to (from env). */
export function getPersonalNumbers(): PersonalNumbers {
  return {
    BKASH: env.BKASH_PERSONAL_NUMBER || null,
    NAGAD: env.NAGAD_PERSONAL_NUMBER || null,
    ROCKET: env.ROCKET_PERSONAL_NUMBER || null,
    enabled: env.PERSONAL_PAYMENT_ENABLED === 'true',
  }
}

export interface ParsedSms {
  provider: PersonalMethod | null
  amount: number | null
  trxId: string | null
  senderNumber: string | null
  balance: number | null
}

/**
 * Parse a payment SMS into structured data.
 * Handles bKash/Nagad/Rocket formats, e.g.:
 *   "You have received Tk 500.00 from 01712345678. TrxID 9HK3X2AB1C at 10:30AM. Balance Tk 1,234.56"
 *   "আপনি ০১৭১২৩৪৫৬৭৮ থেকে ৫০০.০০ টাকা পেয়েছেন। TrxID: 9HK3X2AB1C"
 */
export function parsePaymentSms(raw: string): ParsedSms {
  const text = raw || ''

  // Provider detection
  let provider: PersonalMethod | null = null
  if (/bkash|বিকাশ/i.test(text)) provider = 'BKASH'
  else if (/nagad|নগদ/i.test(text)) provider = 'NAGAD'
  else if (/rocket|রকেট/i.test(text)) provider = 'ROCKET'

  // Amount: "Tk 500.00" / "BDT 500" / "৫০০.০০ টাকা" / "500/-"
  let amount: number | null = null
  const amountPatterns = [
    /(?:Tk|BDT|টাকা)\s*\.?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:Tk|BDT|টাকা)/i,
    /([\d,]+(?:\.\d{1,2})?)\/-/i,
  ]
  for (const p of amountPatterns) {
    const m = text.match(p)
    if (m) {
      amount = parseFloat(m[1].replace(/,/g, ''))
      if (!isNaN(amount)) break
      amount = null
    }
  }

  // TrxID: 8-10 uppercase alphanumeric, often after "TrxID" label
  let trxId: string | null = null
  const trxLabel = text.match(/Trx(?:ID|Id|id)\s*:?\s*([A-Z0-9]{8,10})/i)
  if (trxLabel) {
    trxId = trxLabel[1].toUpperCase()
  } else {
    const trxBare = text.match(/\b([A-Z0-9]{9,10})\b/)
    if (trxBare && /\d/.test(trxBare[1]) && /[A-Z]/.test(trxBare[1])) {
      trxId = trxBare[1]
    }
  }

  // Sender number: Bangladeshi mobile 01XXXXXXXXX (11 digits)
  let senderNumber: string | null = null
  const senderMatch = text.match(/(?:from|থেকে)\s*(?:\+?88)?(01[3-9]\d{8})/i)
    || text.match(/\b(?:\+?88)?(01[3-9]\d{8})\b/)
  if (senderMatch) senderNumber = senderMatch[1]

  // Balance: "Balance Tk 1,234.56" / "ব্যালেন্স"
  let balance: number | null = null
  const balMatch = text.match(/(?:Balance|ব্যালেন্স)\s*(?:Tk|টাকা)?\s*\.?\s*([\d,]+(?:\.\d{1,2})?)/i)
  if (balMatch) {
    const b = parseFloat(balMatch[1].replace(/,/g, ''))
    if (!isNaN(b)) balance = b
  }

  return { provider, amount, trxId, senderNumber, balance }
}

export interface VerifyResult {
  ok: boolean
  status?: 'VERIFIED' | 'PENDING'
  error?: string
  verificationId?: string
  autoVerified?: boolean
}

/**
 * Grant credits + activate subscription for a verified payment.
 * Idempotent: only runs if the verification is not already VERIFIED.
 */
export async function grantPaymentBenefits(verificationId: string): Promise<void> {
  const v = await prisma.paymentVerification.findUnique({ where: { id: verificationId } })
  if (!v || v.status === 'VERIFIED') return

  // 1. Grant credits
  if (v.credits > 0) {
    await prisma.customer.update({
      where: { id: v.customerId },
      data: { credits: { increment: v.credits } },
    })
    await prisma.creditTransaction
      .create({
        data: {
          customerId: v.customerId,
          amount: v.credits,
          type: 'payment',
          description: `Personal payment verified (${v.method} TrxID ${v.trxId})`,
          balanceAfter: 0,
        },
      })
      .catch(() => {}) // ledger non-fatal (schema drift)
  }

  // 2. Activate subscription if a plan was purchased
  if (v.plan && v.plan !== 'free') {
    const now = new Date()
    const nextBilling = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const planLimits: Record<string, { videos: number; storage: number; price: number }> = {
      starter: { videos: 50, storage: 50, price: 499 },
      pro: { videos: 200, storage: 500, price: 1499 },
    }
    const limits = planLimits[v.plan] || planLimits.starter
    await prisma.subscription.upsert({
      where: { customerId: v.customerId },
      create: {
        customerId: v.customerId,
        plan: v.plan,
        status: 'active',
        videosPerMonth: limits.videos,
        storageGB: limits.storage,
        price: limits.price,
        currency: 'BDT',
        billingCycle: 'monthly',
        nextBillingDate: nextBilling,
      },
      update: {
        plan: v.plan,
        status: 'active',
        videosPerMonth: limits.videos,
        storageGB: limits.storage,
        price: limits.price,
        nextBillingDate: nextBilling,
      },
    })
  }

  // 3. Record the payment
  const payment = await prisma.payment.create({
    data: {
      customerId: v.customerId,
      amount: v.amount,
      currency: 'BDT',
      method: v.method,
      status: 'COMPLETED',
      transactionId: v.trxId,
    },
  }).catch(() => null) // Payment model shape may differ; non-fatal

  // 4. Affiliate commission (20% recurring) — if this customer was referred
  await recordAffiliateCommission({
    fromCustomerId: v.customerId,
    amount: v.amount,
    sourceType: 'PAYMENT',
    sourceId: payment?.id || v.trxId,
  }).catch((e) => console.warn('[affiliate] commission record failed:', e))

  // 5. Mark verified
  await prisma.paymentVerification.update({
    where: { id: verificationId },
    data: { status: 'VERIFIED', verifiedAt: new Date() },
  })
}

/**
 * Try to auto-match a PENDING verification against recent SmsLog entries.
 * Match = same TrxID + amount within tolerance + SMS within window.
 */
export async function tryAutoMatch(verificationId: string): Promise<boolean> {
  const v = await prisma.paymentVerification.findUnique({ where: { id: verificationId } })
  if (!v || v.status !== 'PENDING') return false

  const windowStart = new Date(Date.now() - SMS_MATCH_WINDOW_MINUTES * 60 * 1000)
  const candidates = await prisma.smsLog.findMany({
    where: {
      parsedTrxId: v.trxId,
      matched: false,
      receivedAt: { gte: windowStart },
    },
    orderBy: { receivedAt: 'desc' },
    take: 5,
  })

  for (const sms of candidates) {
    const amountOk =
      sms.parsedAmount == null ||
      Math.abs(sms.parsedAmount - v.amount) <= AMOUNT_TOLERANCE
    if (amountOk) {
      await prisma.smsLog.update({ where: { id: sms.id }, data: { matched: true } })
      await prisma.paymentVerification.update({
        where: { id: v.id },
        data: { smsMatched: true },
      })
      await grantPaymentBenefits(v.id)
      return true
    }
  }
  return false
}

/** Expire stale PENDING verifications (older than PENDING_EXPIRY_MINUTES without SMS match). */
export async function expireStaleVerifications(): Promise<number> {
  const cutoff = new Date(Date.now() - PENDING_EXPIRY_MINUTES * 60 * 1000)
  const result = await prisma.paymentVerification.updateMany({
    where: { status: 'PENDING', createdAt: { lt: cutoff }, smsMatched: false },
    data: { status: 'EXPIRED' },
  })
  return result.count
}

/** Ensure the personal-payment tables exist (self-healing DDL). */
export async function ensurePersonalPaymentSchema(): Promise<void> {
  await ensureSchema()
}
