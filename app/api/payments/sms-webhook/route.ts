export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'
import {
  parsePaymentSms,
  AMOUNT_TOLERANCE,
  grantPaymentBenefits,
  ensurePersonalPaymentSchema,
} from '@/lib/payments/personal'

/**
 * POST /api/payments/sms-webhook
 * Receives incoming payment SMS from the Android SMS-sync app (bKash Sync pattern).
 * Protected by SMS_WEBHOOK_SECRET (header: x-sms-secret).
 *
 * Body: { sms: string }  (raw SMS text)
 *
 * Flow: parse → save SmsLog → match against PENDING PaymentVerification
 *       (same TrxID + amount ±1 Tk) → auto-VERIFIED + credits + subscription.
 */
export async function POST(req: NextRequest) {
  try {
    // Auth: shared secret
    const secret = env.SMS_WEBHOOK_SECRET
    if (!secret) {
      return NextResponse.json(
        { error: 'WEBHOOK_NOT_CONFIGURED', message: 'Set SMS_WEBHOOK_SECRET to enable the SMS sync webhook.' },
        { status: 503 }
      )
    }
    const provided = req.headers.get('x-sms-secret') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (provided !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const rawSms = String(body.sms || body.message || body.text || '').trim()
    if (!rawSms) {
      return NextResponse.json({ error: 'INVALID_BODY', message: 'Provide { sms: "<raw SMS text>" }' }, { status: 400 })
    }

    await ensurePersonalPaymentSchema()

    // Parse the SMS
    const parsed = parsePaymentSms(rawSms)

    // Save to SmsLog
    const log = await prisma.smsLog.create({
      data: {
        rawSms,
        provider: parsed.provider,
        parsedAmount: parsed.amount,
        parsedTrxId: parsed.trxId,
        senderNumber: parsed.senderNumber,
        balance: parsed.balance,
      },
    })

    // Only payment SMS with a TrxID can match
    if (!parsed.trxId) {
      return NextResponse.json({ ok: true, logId: log.id, matched: false, reason: 'no_trxid_in_sms' })
    }

    // Find a PENDING verification with the same TrxID
    const pending = await prisma.paymentVerification.findUnique({
      where: { trxId: parsed.trxId },
    })

    if (!pending || pending.status !== 'PENDING') {
      return NextResponse.json({ ok: true, logId: log.id, matched: false, reason: 'no_pending_verification' })
    }

    // Amount tolerance check
    const amountOk =
      parsed.amount == null || Math.abs(parsed.amount - pending.amount) <= AMOUNT_TOLERANCE
    if (!amountOk) {
      return NextResponse.json({
        ok: true,
        logId: log.id,
        matched: false,
        reason: 'amount_mismatch',
        smsAmount: parsed.amount,
        claimedAmount: pending.amount,
      })
    }

    // Match! Mark SMS matched, grant benefits
    await prisma.smsLog.update({ where: { id: log.id }, data: { matched: true } })
    await prisma.paymentVerification.update({
      where: { id: pending.id },
      data: { smsMatched: true },
    })
    await grantPaymentBenefits(pending.id)

    return NextResponse.json({
      ok: true,
      logId: log.id,
      matched: true,
      verificationId: pending.id,
      status: 'VERIFIED',
    })
  } catch (err) {
    console.error('[sms-webhook] error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
