export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'
import {
  parsePaymentSms,
  AMOUNT_TOLERANCE,
  grantPaymentBenefits,
  ensurePersonalPaymentSchema,
} from '@/lib/payments/personal'
import { PAYMENT_PLANS, PRICING } from '@/lib/pricing'
import { grantPlanPurchase } from '@/lib/credit-grant'
import { sendPaymentReceiptEmail, sendWelcomeEmail } from '@/lib/email'

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

    // Find a PENDING verification with the same TrxID (paymentVerification table)
    const pending = await prisma.paymentVerification.findUnique({
      where: { trxId: parsed.trxId },
    })

    if (pending && pending.status === 'PENDING') {
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
    }

    // --- Fallback: try to match a store-order Transaction (bkash_personal) ---
    const txn = await prisma.transaction.findFirst({
      where: {
        gatewayTrxId: parsed.trxId,
        status: { in: ['pending', 'pending_verification'] },
        gateway: 'bkash_personal',
      },
      include: { customer: { select: { id: true, email: true, name: true } } },
    })

    if (txn) {
      // Amount tolerance check
      const amountOk =
        parsed.amount == null || Math.abs(parsed.amount - (txn.amount || 0)) <= AMOUNT_TOLERANCE
      if (!amountOk) {
        return NextResponse.json({
          ok: true,
          logId: log.id,
          matched: false,
          reason: 'amount_mismatch_transaction',
          smsAmount: parsed.amount,
          claimedAmount: txn.amount,
        })
      }

      // Match! Approve the Transaction (same logic as admin approve)
      await prisma.smsLog.update({ where: { id: log.id }, data: { matched: true } })
      await prisma.transaction.update({
        where: { id: txn.id },
        data: { status: 'completed' },
      })

      // Grant credits + activate subscription
      const pkgKey = (txn.videoPackage || 'starter').toLowerCase()
      const planLabel = pkgKey.toUpperCase()
      const tier = (['starter', 'pro', 'business'] as const).includes(
        pkgKey as 'starter' | 'pro' | 'business',
      )
        ? (pkgKey as 'starter' | 'pro' | 'business')
        : 'starter'
      const planInfo = PRICING[tier]
      const planPrice = PAYMENT_PLANS[tier as keyof typeof PAYMENT_PLANS]?.price || planInfo.taka
      const endsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      await prisma.subscription.upsert({
        where: { customerId: txn.customer.id },
        update: {
          plan: planLabel,
          status: 'active',
          videosPerMonth: planInfo.videosPerMonth,
          storageGB: planInfo.storageGB,
          price: planPrice,
          currency: 'BDT',
          billingCycle: 'monthly',
          nextBillingDate: endsAt,
        },
        create: {
          customerId: txn.customer.id,
          plan: planLabel,
          status: 'active',
          videosPerMonth: planInfo.videosPerMonth,
          storageGB: planInfo.storageGB,
          price: planPrice,
          currency: 'BDT',
          billingCycle: 'monthly',
          nextBillingDate: endsAt,
        },
      })

      const creditsToAdd = txn.creditsAdded > 0 ? txn.creditsAdded : planInfo.credits
      await grantPlanPurchase({
        customerId: txn.customer.id,
        credits: creditsToAdd,
        plan: planLabel,
        reference: `TrxID ${txn.gatewayTrxId || txn.id}`,
      })

      // Audit + notification + email
      await prisma.activityLog.create({
        data: {
          customerId: txn.customer.id,
          action: 'payment_auto_approved',
          description: `SMS auto-approved ${txn.gateway} TrxID ${txn.gatewayTrxId} — ${planLabel} subscription activated, +${creditsToAdd} credits`,
        },
      }).catch(() => {})

      await prisma.notification.create({
        data: {
          customerId: txn.customer.id,
          type: 'payment_verified',
          title: 'পেমেন্ট নিশ্চিত! ✅',
          message: `${creditsToAdd} ক্রেডিট যোগ হয়েছে। ${planLabel} প্ল্যান চালু।`,
          actionUrl: '/dashboard',
        },
      }).catch(() => {})

      // Email receipt (fire-and-forget)
      try {
        if (txn.customer.email) {
          await sendPaymentReceiptEmail(
            txn.customer.email,
            txn.customer.name || txn.customer.email,
            planLabel,
            txn.amount || planPrice,
            txn.gatewayTrxId || txn.id,
            (txn.gateway || 'bkash_personal').toUpperCase(),
          )
        }
      } catch {}

      return NextResponse.json({
        ok: true,
        logId: log.id,
        matched: true,
        transactionId: txn.id,
        status: 'VERIFIED',
      })
    }

    // No match in either table
    return NextResponse.json({ ok: true, logId: log.id, matched: false, reason: 'no_pending_verification' })
  } catch (err) {
    console.error('[sms-webhook] error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'INTERNAL_ERROR', detail: msg }, { status: 500 })
  }
}
