export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'
import { prisma } from '@/lib/prisma'
import { PAYMENT_PLANS, planCredits, planPrice, type PaymentPlanId } from '@/lib/pricing'

// ---------------------------------------------------------------------------
// POST /api/billing/verify-trx — REAL TrxID verification for the personal
// Send-Money flow (bKash/Nagad/Rocket). V17: replaces the /pricing page's
// client-side fake-success demo branch, which "verified" ANY 6+ char string.
//
// Flow:
//   1. Customer creates an order via /api/payment/create (pending, invoiceNumber=HOST…)
//   2. Customer sends money to 01822417463 with that reference
//   3. Customer submits the bKash TrxID here
//   4. We record a pending_verification Transaction row keyed by the TrxID
//      (idempotent — a TrxID can only ever be submitted once)
//   5. Admin approves via /api/admin/payments/approve/[transactionId]
//      (or the Android SMS auto-match verifies it) → credits are granted
//
// NEVER grants credits in this endpoint — the admin approve endpoint owns
// the +credits write. A fake TrxID gets a 400, never a success UI.
// ---------------------------------------------------------------------------

const TRXID_RE = /^[A-Z0-9]{8,22}$/

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { trxId, plan, amount } = await req.json().catch(() => ({})) as {
      trxId?: string
      plan?: string
      amount?: number
    }

    if (!trxId || !plan) {
      return NextResponse.json({ error: 'পেমেন্ট তথ্য অসম্পূর্ণ — TrxID ও প্ল্যান দিন' }, { status: 400 })
    }

    const cleaned = String(trxId).trim().toUpperCase()
    if (!TRXID_RE.test(cleaned)) {
      return NextResponse.json(
        { error: 'Invalid TrxID — Check bKash SMS TrxID (8-22 letters/digits)', code: 'INVALID_TRX_ID' },
        { status: 400 },
      )
    }

    const planInfo = PAYMENT_PLANS[plan as PaymentPlanId]
    if (!planInfo) {
      return NextResponse.json(
        { error: `Invalid plan. Choose: starter, pro, business`, code: 'INVALID_PLAN' },
        { status: 400 },
      )
    }

    // Amount must match the single-source plan price (±1 Tk tolerance).
    const expected = planPrice(plan)
    if (typeof amount === 'number' && amount > 0 && Math.abs(amount - expected) > 1) {
      return NextResponse.json(
        { error: `Amount mismatch — ${planInfo.name} costs ৳${expected}. Send ৳${expected} and resubmit.`, code: 'AMOUNT_MISMATCH' },
        { status: 400 },
      )
    }

    // Idempotency: a TrxID can only be used once, by anyone.
    const existing = await prisma.transaction.findFirst({ where: { gatewayTrxId: cleaned } })
    if (existing) {
      if (existing.status === 'completed' || existing.status === 'success') {
        return NextResponse.json(
          { error: 'এই TrxID আগেই ব্যবহার করা হয়েছে (already completed)', code: 'TRX_ALREADY_USED' },
          { status: 409 },
        )
      }
      // Same customer resubmitting a still-pending TrxID → idempotent success
      if (existing.customerId === authUser.id) {
        return NextResponse.json({
          ok: true,
          status: 'pending_verification',
          plan: planInfo.name,
          credits: planCredits(plan),
          message: 'আপনার TrxID এখনো যাচাই অপেক্ষায় আছে — অ্যাডমিন অনুমোদনের পর ক্রেডিট যোগ হবে।',
        })
      }
      return NextResponse.json(
        { error: 'এই TrxID আগেই ব্যবহার করা হয়েছে', code: 'TRX_ALREADY_USED' },
        { status: 409 },
      )
    }

    // Record the submission for admin review (credits granted on approve).
    await prisma.transaction.create({
      data: {
        customerId: authUser.id,
        amount: expected,
        currency: 'BDT',
        status: 'pending_verification',
        gateway: 'bkash_personal',
        gatewayTrxId: cleaned,
        videoPackage: plan,
        creditsAdded: planCredits(plan),
        cardType: null,
        cardBrand: '01822417463',
      },
    })

    // Notify admin for review
    await prisma.notification.create({
      data: {
        customerId: authUser.id,
        type: 'payment_pending',
        title: 'নতুন bKash পেমেন্ট',
        message: `${authUser.name || authUser.email} — ${planInfo.name} ৳${expected} — TrxID: ${cleaned}`,
        actionUrl: '/dashboard/admin/payments',
      },
    }).catch(() => {})

    return NextResponse.json({
      ok: true,
      status: 'pending_verification',
      plan: planInfo.name,
      credits: planCredits(plan),
      message: `TrxID গৃহীত হয়েছে! অ্যাডমিন যাচাই করলে ${planCredits(plan).toLocaleString()} ক্রেডিট যোগ হবে (সাধারণত ১০ মিনিট)।`,
    })
  } catch (error: any) {
    console.error('verify-trx error:', error?.message || error)
    return NextResponse.json({ error: 'TrxID যাচাই করতে সমস্যা হয়েছে' }, { status: 500 })
  }
}
