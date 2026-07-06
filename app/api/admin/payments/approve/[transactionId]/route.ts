import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/admin/payments/approve/[transactionId]
 *
 * Manually confirms a pending bKash/Nagad/Rocket personal-number
 * transaction. The "Day 4 webhook" for when we don't have real gateway
 * creds — pays flow is:
 *
 *   1. Customer sends money to bKash 01822417463 via personal app
 *   2. Customer submits TrxID via POST /api/payment/bkash-verify
 *      → Transaction row created with status='pending_verification'
 *      → Notification/title 'নতুন bKash পেমেন্ট' written
 *   3. Admin opens /admin/payments, sees pending rows
 *   4. Admin clicks Approve → THIS endpoint fires
 *   5. Subscription flipped pending → active; customer credits granted
 *   6. Welcome/payment email fires (fallback path if SMTP not configured)
 *   7. Notification+activityLog entry written
 *
 * Body optional: { planOverride?: 'STARTER'|'GROWTH'|'PRO', notes?: string }
 */
const PLAN_MAP: Record<string, { videos: number; storage: number; price: number }> = {
  starter:  { videos: 20,  storage: 10,  price: 500 },
  growth:   { videos: 30,  storage: 50,  price: 2000 },
  pro:      { videos: 999, storage: 100, price: 3500 },
  business: { videos: 999, storage: 500, price: 5000 },
  free:     { videos: 5,   storage: 1,   price: 0   },
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ transactionId: string }> }
) {
  try {
    await requireAdmin(req)
    const { transactionId } = await ctx.params
    if (!transactionId) {
      return NextResponse.json({ error: 'transactionId required' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const planOverride = body?.planOverride ? String(body.planOverride).toLowerCase() : null
    const notes = body?.notes ? String(body.notes).slice(0, 280) : null

    // Find the pending transaction
    const txn = await prisma.transaction.findFirst({
      where: {
        OR: [
          { id: transactionId },
          { gatewayTrxId: transactionId },
        ],
      },
      include: {
        customer: { select: { id: true, email: true, name: true } },
      },
    })

    if (!txn) {
      return NextResponse.json({ error: 'transaction not found', transactionId }, { status: 404 })
    }

    if (txn.status === 'completed' || txn.status === 'success') {
      return NextResponse.json({
        success: true,
        alreadyCompleted: true,
        transactionId: txn.id,
        status: txn.status,
      })
    }
    if (txn.status !== 'pending' && txn.status !== 'pending_verification') {
      return NextResponse.json(
        { success: false, error: `transaction is ${txn.status}, cannot approve` },
        { status: 409 },
      )
    }

    const pkgKey = planOverride || (txn.videoPackage || 'starter').toLowerCase()
    const planInfo = PLAN_MAP[pkgKey] || PLAN_MAP['starter']
    const planLabel = pkgKey.toUpperCase()

    // 1. Flip transaction to completed
    const updated = await prisma.transaction.update({
      where: { id: txn.id },
      data: { status: 'completed' },
    })

    // 2. Activate (or upgrade) subscription
    const endsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const sub = await prisma.subscription.upsert({
      where: { customerId: txn.customer.id },
      update: {
        plan: planLabel,
        status: 'active',
        videosPerMonth: planInfo.videos,
        storageGB: planInfo.storage,
        price: planInfo.price,
        currency: 'BDT',
        billingCycle: 'monthly',
        nextBillingDate: endsAt,
      },
      create: {
        customerId: txn.customer.id,
        plan: planLabel,
        status: 'active',
        videosPerMonth: planInfo.videos,
        storageGB: planInfo.storage,
        price: planInfo.price,
        currency: 'BDT',
        billingCycle: 'monthly',
        nextBillingDate: endsAt,
      },
    })

    // 3. Add credits
    const creditsToAdd = txn.creditsAdded > 0 ? txn.creditsAdded : planInfo.videos
    await prisma.customer.update({
      where: { id: txn.customer.id },
      data: { credits: { increment: creditsToAdd } },
    })

    // 4. Audit log
    try {
      await prisma.activityLog.create({
        data: {
          customerId: txn.customer.id,
          action: 'payment_approved',
          description: `Admin approved ${txn.gateway} TrxID ${txn.gatewayTrxId || txn.id} — ${planLabel} subscription activated, +${creditsToAdd} credits${notes ? ' (' + notes + ')' : ''}`,
        },
      })
    } catch {}

    // 5. Notification
    try {
      await prisma.notification.create({
        data: {
          customerId: txn.customer.id,
          type: 'payment_verified',
          title: 'পেমেন্ট নিশ্চিত! ✅',
          message: `${creditsToAdd} ক্রেডিট যোগ হয়েছে। ${planLabel} প্ল্যান চালু।`,
          actionUrl: '/dashboard',
        },
      })
    } catch {}

    // 6. Send payment receipt email (fire-and-forget; lib/email.ts falls
    //    back gracefully when SMTP_HOST unset so this never 500s the API)
    let emailResult: { success?: boolean; sent?: boolean; fallback?: boolean; error?: string } = { success: false, fallback: true }
    try {
      const libEmail = await import('@/lib/email').catch(() => null)
      const { sendPaymentReceiptEmail, sendWelcomeEmail } = libEmail || ({} as any)
      if (sendPaymentReceiptEmail && txn.customer.email) {
        const r: any = await sendPaymentReceiptEmail(
          txn.customer.email,
          txn.customer.name || txn.customer.email,
          planLabel,
          txn.amount || planInfo.price,
          txn.gatewayTrxId || txn.id,
          (txn.gateway || 'bkash_personal').toUpperCase(),
        )
        if (r && typeof r === 'object') {
          // Normalize so callers see a single shape regardless of which send* helper was used
          emailResult = {
            success: !!r.success,
            fallback: !!r.fallback,
            error: r.error?.message || (typeof r.error === 'string' ? r.error : undefined),
          }
        }
      }
      // Also send welcome if first paid customer
      if (sendWelcomeEmail && txn.customer.email) {
        try {
          await sendWelcomeEmail(txn.customer.email, txn.customer.name || txn.customer.email)
        } catch {}
      }
    } catch (e: any) {
      emailResult = { success: false, fallback: true, error: e?.message || 'email threw' }
      console.warn('[payment-approve] email fallback:', e?.message || e)
    }

    return NextResponse.json({
      success: true,
      transactionId: txn.id,
      gatewayTrxId: txn.gatewayTrxId,
      customer: { id: txn.customer.id, email: txn.customer.email },
      plan: planLabel,
      subscription: {
        id: sub.id,
        status: 'active',
        nextBillingDate: endsAt.toISOString(),
      },
      creditsAdded: creditsToAdd,
      email: emailResult,
    })
  } catch (error: any) {
    const status = error?.cause?.status || 500
    return NextResponse.json(
      { success: false, error: error?.message || 'approve failed' },
      { status },
    )
  }
}
