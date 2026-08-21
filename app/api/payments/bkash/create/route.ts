export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { bkashConfig, createCheckout } from '@/lib/payment/bkash'
import { v4 as uuidv4 } from 'uuid'

// ============================================================================
// POST /api/payments/bkash/create
// Initiates a real bKash tokenized-checkout payment.
// Returns 503 PAYMENT_NOT_CONFIGURED when bKash credentials are missing —
// never a mock/fake payment URL.
// ============================================================================

// Credits granted per plan on successful payment
const CREDITS_MAP: Record<string, number> = {
  starter: 10, growth: 30, pro: 100,
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { planName = 'starter', amount = 500 } = body
    // Payments are always for the authenticated customer — never trust a
    // client-supplied customerId.
    const customerId = authUser.id

    const customer = await prisma.customer.findUnique({ where: { id: customerId } })
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const cfg = bkashConfig()
    if (!cfg.configured) {
      return NextResponse.json(
        {
          error: 'PAYMENT_NOT_CONFIGURED',
          message: 'Add real bKash credentials (BKASH_APP_KEY, BKASH_APP_SECRET, BKASH_USERNAME, BKASH_PASSWORD) from developer.bka.sh to enable bKash payments.',
        },
        { status: 503 }
      )
    }

    const planKey = (planName || 'starter').toLowerCase()
    const invoice = `HOSTAMAR-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`
    const callbackUrl = `${process.env.NEXTAUTH_URL || 'https://hostamar.com'}/api/payments/webhook`

    const result = await createCheckout({
      amount: Number(amount),
      orderId: invoice,
      intent: 'sale',
      callbackUrl,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error || 'bKash create failed' }, { status: 502 })
    }

    // Create pending payment record linked to the bKash paymentID
    await prisma.payment.create({
      data: {
        customerId,
        method: 'bkash',
        amount: Number(amount),
        currency: 'BDT',
        status: 'pending',
        transactionId: result.paymentId || invoice,
        providerPaymentId: result.paymentId || null,
        invoiceNumber: invoice,
        planName: planKey,
      },
    })

    return NextResponse.json({
      success: true,
      payment_url: result.bkashUrl,
      transaction_id: result.paymentId || invoice,
      invoice,
      mode: cfg.isProduction ? 'bkash_production' : 'bkash_sandbox',
      creditsOnSuccess: CREDITS_MAP[planKey] || 10,
    })
  } catch (error: any) {
    console.error('[Payments:bKash:Create]', error?.message || error)
    return NextResponse.json({ error: 'Failed to create bKash payment' }, { status: 500 })
  }
}
