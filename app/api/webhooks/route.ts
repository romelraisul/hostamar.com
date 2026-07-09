import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ============================================================================
// POST /api/webhooks
// Manual payment confirmation for PERSONAL, send-money-only accounts.
//
// Context: Hostamar has NO bKash/Nagad/Rocket business/merchant account, only
// personal numbers. There is therefore NO automated gateway callback/webhook.
// The real flow is: the customer sends money manually to the personal number,
// then submits the transaction proof here. The payment is recorded as `pending`
// (manual verification). The owner later confirms it (optional secret header)
// which activates the subscription.
//
// Personal receiver numbers (send-money only) — override via .env.
//   bKash:  01822417463
//   Rocket: 01822417463
//   Nagad:  01711317101
// ============================================================================

const RECEIVER = {
  bkash: process.env.BKASH_NUMBER || '01822417463',
  rocket: process.env.ROCKET_NUMBER || '01822417463',
  nagad: process.env.NAGAD_NUMBER || '01711317101',
} as const

type Method = keyof typeof RECEIVER

const PLAN_MAP: Record<string, { plan: string; videos: number; storage: number; price: number }> = {
  starter: { plan: 'STARTER', videos: 20, storage: 10, price: 2000 },
  growth: { plan: 'GROWTH', videos: 30, storage: 50, price: 2000 },
  business: { plan: 'BUSINESS', videos: 999, storage: 100, price: 3500 },
  enterprise: { plan: 'ENTERPRISE', videos: 999, storage: 500, price: 6000 },
}

function mapPlan(planKey: string) {
  return PLAN_MAP[(planKey || 'starter').toLowerCase()] || PLAN_MAP.starter
}

// --- Activate subscription after owner-confirmed payment ---
async function activateSubscription(customerId: string, planKey: string, amount: number) {
  const info = mapPlan(planKey)
  const nextBillingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  await prisma.subscription.upsert({
    where: { customerId },
    update: {
      plan: info.plan,
      status: 'active',
      videosPerMonth: info.videos,
      storageGB: info.storage,
      price: info.price,
      nextBillingDate,
    },
    create: {
      customerId,
      plan: info.plan,
      status: 'active',
      videosPerMonth: info.videos,
      storageGB: info.storage,
      price: info.price,
      currency: 'BDT',
      billingCycle: 'monthly',
      nextBillingDate,
    },
  })
  await prisma.activityLog
    .create({
      data: {
        customerId,
        action: 'payment_completed',
        description: `Manual payment of ৳${amount} via personal account for ${planKey} plan`,
      },
    })
    .catch(() => {})
}

// --- Main handler ---
export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const secret = (req.headers.get('x-payment-secret') as string) || (payload.secret as string)

    const method = (payload.method as string)?.toLowerCase() as Method
    const transactionId = payload.transactionId as string
    const customerId = payload.customerId as string
    const amount = Number(payload.amount) || 0
    const planName = (payload.planName as string) || 'starter'
    const senderPhone = payload.senderPhone as string | undefined

    // ── Owner confirmation mode (optional) ──────────────────────────────────
    // If PAYMENT_CONFIRM_SECRET is set and the caller supplies it, flip the
    // matching pending payment to completed and activate the subscription.
    if (secret && process.env.PAYMENT_CONFIRM_SECRET && secret === process.env.PAYMENT_CONFIRM_SECRET) {
      if (!transactionId) {
        return NextResponse.json({ error: 'transactionId required to confirm' }, { status: 400 })
      }
      const payment = await prisma.payment.findFirst({ where: { transactionId } })
      if (!payment) {
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
      }
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'completed', webhookSent: true } })
      await activateSubscription(payment.customerId, payment.planName || planName, payment.amount)
      return NextResponse.json({ success: true, status: 'completed', transactionId })
    }

    // ── Customer submission mode (I sent the money) ─────────────────────────
    if (!method || !(method in RECEIVER)) {
      return NextResponse.json(
        { error: 'Invalid method. Use bkash, nagad, or rocket.' },
        { status: 400 },
      )
    }
    if (!transactionId) {
      return NextResponse.json({ error: 'transactionId (reference) is required' }, { status: 400 })
    }
    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 })
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } })
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Record as pending — no gateway auto-verification available.
    await prisma.payment.upsert({
      where: { transactionId },
      update: { status: 'pending', amount: amount || undefined, method },
      create: {
        customerId,
        method,
        amount,
        currency: 'BDT',
        status: 'pending',
        transactionId,
        planName,
        walletAddress: RECEIVER[method], // store receiver number for owner cross-check
      },
    })

    if (senderPhone) {
      await prisma.customer
        .update({ where: { id: customerId }, data: { phone: senderPhone } })
        .catch(() => {})
    }

    return NextResponse.json({
      success: true,
      status: 'pending',
      method,
      receiver: RECEIVER[method],
      transactionId,
      message:
        'পেমেন্ট রিসিভ করা হয়েছে। Hostamar টিম ম্যানুয়ালি ভেরিফাই করার পর আপনার সাবস্ক্রিপশন অ্যাক্টিভ হবে।',
    })
  } catch (error: any) {
    console.error('[webhooks] Error:', error?.message)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
