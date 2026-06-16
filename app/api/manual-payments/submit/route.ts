import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import prisma from '@/lib/prisma'

/**
 * Manual payment submission — user reports a bKash/Nagad/Rocket/USDT transaction.
 *
 * POST /api/manual-payments/submit
 * body: { method: 'bkash'|'nagad'|'rocket'|'usdt', trxId: string, amount: number, plan: 'starter'|'business'|'enterprise' }
 *
 * Creates a Payment row with status='pending' — admin will verify separately
 * via /api/admin/manual-payments/[id]/verify.
 *
 * Why this exists: until we have a bKash Payment Gateway merchant account
 * (or Nagad integration), users send money to our bKash/Nagad numbers manually
 * and submit a screenshot/trx-id. Phase 0.3 stub. Replace with bKash PG webhook
 * in Phase 1 once the merchant account is approved.
 */

const VALID_METHODS = ['bkash', 'nagad', 'rocket', 'usdt']
const VALID_PLANS = ['starter', 'business', 'enterprise']
const AMOUNT_BOUNDS: Record<string, [number, number]> = {
  bkash: [10, 100000],
  nagad: [10, 100000],
  rocket: [10, 100000],
  usdt: [1, 5000], // USDT decimal
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { method, trxId, amount, plan } = body || {}

    if (!VALID_METHODS.includes(method)) {
      return NextResponse.json({ error: `method must be one of ${VALID_METHODS.join('/')}` }, { status: 400 })
    }
    if (!VALID_PLANS.includes(plan)) {
      return NextResponse.json({ error: `plan must be one of ${VALID_PLANS.join('/')}` }, { status: 400 })
    }
    if (!trxId || typeof trxId !== 'string' || trxId.length < 3 || trxId.length > 80) {
      return NextResponse.json({ error: 'trxId is required (3-80 chars)' }, { status: 400 })
    }

    const [min, max] = AMOUNT_BOUNDS[method]
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt < min || amt > max) {
      return NextResponse.json(
        { error: `amount must be between ${min} and ${max} ${method === 'usdt' ? 'USDT' : 'BDT'}` },
        { status: 400 }
      )
    }

    // prevent duplicate submissions of the same trxId
    const existing = await prisma.payment.findUnique({
      where: { transactionId: trxId },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'This transaction ID was already submitted' },
        { status: 409 }
      )
    }

    const id = `pay_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
    const payment = await prisma.payment.create({
      data: {
        id,
        customerId: user.id,
        method,
        amount: amt,
        currency: method === 'usdt' ? 'USDT' : 'BDT',
        status: 'pending',
        transactionId: trxId,
        planName: plan,
        billingPeriod: 'monthly',
      },
    })

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      message: 'আপনার পেমেন্ট যাচাই করা হচ্ছে। সাধারণত ১ ঘণ্টার মধ্যে সম্পন্ন হয়।',
    })
  } catch (error) {
    console.error('[manual-payments/submit]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
