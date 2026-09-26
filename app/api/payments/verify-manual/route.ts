export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { planCredits } from '@/lib/pricing'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { notify } from '@/lib/support/telegram'
import {
  TRXID_REGEX,
  PENDING_EXPIRY_MINUTES,
  VERIFY_RATE_LIMIT_PER_MIN,
  getPersonalNumbers,
  tryAutoMatch,
  expireStaleVerifications,
  ensurePersonalPaymentSchema,
  type PersonalMethod,
} from '@/lib/payments/personal'
import { recordOpsEvent, OPS_LANES } from '@/lib/ops-events'

/**
 * POST /api/payments/verify-manual
 * User submits a TrxID after Send Money to our personal number.
 * Body: { method: 'BKASH'|'NAGAD'|'ROCKET', amount: number, senderNumber: string,
 *         trxId: string, plan?: string, credits?: number }
 *
 * Flow: validate → duplicate check → create PENDING → try SMS auto-match →
 *       if matched: VERIFIED + credits + subscription; else stays PENDING for admin.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const nums = getPersonalNumbers()
    if (!nums.enabled) {
      return NextResponse.json(
        { error: 'PERSONAL_PAYMENTS_DISABLED', message: 'Personal Send Money payments are not enabled.' },
        { status: 503 }
      )
    }

    // Rate limit: 5 submissions/min per user
    const rl = await checkRateLimit(
      `${getClientIp(req)}:${user.id}`,
      { bucket: 'payments.verifyManual', limit: VERIFY_RATE_LIMIT_PER_MIN, windowMs: 60_000 },
      '/api/payments/verify-manual',
      'POST'
    )
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'RATE_LIMITED', message: 'Too many submissions. Try again in a minute.' },
        { status: 429 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const { method, amount, senderNumber, trxId, plan, credits } = body as {
      method?: string
      amount?: number
      senderNumber?: string
      trxId?: string
      plan?: string
      credits?: number
    }

    // Validate method
    const m = (method || '').toUpperCase() as PersonalMethod
    if (!['BKASH', 'NAGAD', 'ROCKET'].includes(m)) {
      return NextResponse.json({ error: 'INVALID_METHOD', message: 'method must be BKASH, NAGAD or ROCKET' }, { status: 400 })
    }
    const targetNumber = nums[m]
    if (!targetNumber) {
      return NextResponse.json(
        { error: 'METHOD_NOT_CONFIGURED', message: `${m} personal number is not configured.` },
        { status: 503 }
      )
    }

    // Validate amount
    const amt = Number(amount)
    if (!amt || amt < 10 || amt > 100000) {
      return NextResponse.json({ error: 'INVALID_AMOUNT', message: 'amount must be between 10 and 100000 BDT' }, { status: 400 })
    }

    // Validate sender number (BD mobile)
    if (!senderNumber || !/^01[3-9]\d{8}$/.test(String(senderNumber).replace(/\s/g, ''))) {
      return NextResponse.json({ error: 'INVALID_SENDER_NUMBER', message: 'senderNumber must be a valid BD mobile (01XXXXXXXXX)' }, { status: 400 })
    }

    // Validate TrxID
    const trx = String(trxId || '').trim().toUpperCase()
    if (!TRXID_REGEX.test(trx)) {
      return NextResponse.json({ error: 'INVALID_TRXID', message: 'TrxID must be 8-10 uppercase letters/digits (e.g. 9HK3X2AB1C)' }, { status: 400 })
    }

    await ensurePersonalPaymentSchema()

    // Duplicate check
    const existing = await prisma.paymentVerification.findUnique({ where: { trxId: trx } })
    if (existing) {
      return NextResponse.json(
        { error: 'DUPLICATE_TRXID', message: 'This TrxID was already submitted.', status: existing.status },
        { status: 409 }
      )
    }

    // Housekeeping: expire stale pendings
    await expireStaleVerifications().catch(() => {})

    // Create PENDING verification
    const verification = await prisma.paymentVerification.create({
      data: {
        customerId: user.id,
        method: m,
        amount: amt,
        senderNumber: String(senderNumber).replace(/\s/g, ''),
        trxId: trx,
        plan: plan || null,
        // V17: never trust client-provided credits — single source when a plan is given
        credits: (plan && planCredits(String(plan).toLowerCase())) || Number(credits) || 0,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + PENDING_EXPIRY_MINUTES * 60 * 1000),
      },
    })

    // V70 Ops Center live feed (best-effort, never throws).
    void recordOpsEvent({
      lane: OPS_LANES.payments,
      type: 'PAYMENT',
      severity: 'info',
      title: `TrxID submitted — ${plan || '—'} ৳${amt}`,
      body: `${m} · ${trx} · ${String(senderNumber).replace(/\s/g, '')}`,
      meta: { verificationId: verification.id, method: m, amount: amt, plan: plan || null },
    })

    // Try instant auto-match against SMS log
    const autoVerified = await tryAutoMatch(verification.id).catch(() => false)

    // Notify the owner (best-effort, non-blocking) so a manual payment gets
    // eyes immediately. Reuses the support/ops Telegram channels already used
    // by lib/support/incident.ts — silently no-ops when Telegram is unconfigured.
    void notify(
      'ops',
      [
        '💳 Manual payment submitted',
        `${m} ৳${amt}`,
        `Plan: ${plan || '—'}`,
        `TrxID: ${trx}`,
        `Sender: ${String(senderNumber).replace(/\s/g, '')}`,
        `Customer: ${user.email || user.id}`,
        `VerificationID: ${verification.id}`,
      ].join('\n'),
    ).catch(() => {})

    return NextResponse.json({
      ok: true,
      verificationId: verification.id,
      trxId: trx,
      status: autoVerified ? 'VERIFIED' : 'PENDING',
      autoVerified,
      message: autoVerified
        ? 'পেমেন্ট অটো-ভেরিফাইড! ক্রেডিট যোগ হয়েছে।'
        : 'TrxID জমা হয়েছে ✅ — SMS ম্যাচ হলে সাথে সাথেই ক্রেডিট যোগ হবে; না হলে অ্যাডমিন ২৪ ঘণ্টার মধ্যে যাচাই করে প্ল্যান চালু করবে।',
    })
  } catch (err) {
    console.error('[verify-manual] error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
