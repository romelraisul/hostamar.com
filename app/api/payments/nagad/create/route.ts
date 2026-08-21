export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import crypto from 'crypto'

// ============================================================================
// POST /api/payments/nagad/create
// Initiates a Nagad payment via their merchant API.
// Returns 503 PAYMENT_NOT_CONFIGURED when Nagad credentials are missing —
// never a mock/fake payment URL.
//
// Env vars (from Nagad merchant onboarding):
//   NAGAD_MERCHANT_ID    – merchant account number / ID
//   NAGAD_MERCHANT_KEY   – merchant API key / password
//   NAGAD_API_BASE       – API base URL (provided by Nagad)
// ============================================================================

const NAGAD_API_BASE = process.env.NAGAD_API_BASE || ''
const NAGAD_MERCHANT_ID = process.env.NAGAD_MERCHANT_ID || ''
const NAGAD_MERCHANT_KEY = process.env.NAGAD_MERCHANT_KEY || ''
const NAGAD_IS_CONFIGURED = !!(NAGAD_API_BASE && NAGAD_MERCHANT_ID && NAGAD_MERCHANT_KEY)

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
    // Payments are always for the authenticated customer.
    const customerId = authUser.id

    const customer = await prisma.customer.findUnique({ where: { id: customerId } })
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    if (!NAGAD_IS_CONFIGURED) {
      return NextResponse.json(
        {
          error: 'PAYMENT_NOT_CONFIGURED',
          message: 'Add real Nagad credentials (NAGAD_API_BASE, NAGAD_MERCHANT_ID, NAGAD_MERCHANT_KEY) to enable Nagad payments.',
        },
        { status: 503 }
      )
    }

    const planKey = (planName || 'starter').toLowerCase()
    const invoice = `HOSTAMAR-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
    const returnUrl = `${process.env.NEXTAUTH_URL || 'https://hostamar.com'}/api/payments/webhook`

    // Real Nagad merchant API call
    let paymentUrl: string | undefined
    let paymentRefId: string | undefined
    try {
      const res = await fetch(`${NAGAD_API_BASE}/api/merchant/v1/payment/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Merchant-Id': NAGAD_MERCHANT_ID,
          'X-Merchant-Key': NAGAD_MERCHANT_KEY,
        },
        body: JSON.stringify({
          merchantId: NAGAD_MERCHANT_ID,
          orderId: invoice,
          amount: String(amount),
          currency: 'BDT',
          customerEmail: customer.email || '',
          customerMobile: (customer as any).phone || '',
          returnUrl,
        }),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        return NextResponse.json({ error: `Nagad error ${res.status}: ${text.slice(0, 200)}` }, { status: 502 })
      }
      const data = (await res.json()) as { payment_url?: string; redirect_url?: string; payment_ref_id?: string; reference_id?: string }
      paymentUrl = data.payment_url || data.redirect_url
      paymentRefId = data.payment_ref_id || data.reference_id
      if (!paymentUrl) {
        return NextResponse.json({ error: 'Nagad create returned no payment URL' }, { status: 502 })
      }
    } catch (err: any) {
      return NextResponse.json({ error: `Nagad create failed: ${err?.message || err}` }, { status: 502 })
    }

    await prisma.payment.create({
      data: {
        customerId,
        method: 'nagad',
        amount: Number(amount),
        currency: 'BDT',
        status: 'pending',
        transactionId: paymentRefId || invoice,
        invoiceNumber: invoice,
        planName: planKey,
      },
    })

    return NextResponse.json({
      success: true,
      payment_url: paymentUrl,
      transaction_id: paymentRefId || invoice,
      invoice,
      mode: 'nagad_api',
      creditsOnSuccess: CREDITS_MAP[planKey] || 10,
    })
  } catch (error: any) {
    console.error('[Payments:Nagad:Create]', error?.message || error)
    return NextResponse.json({ error: 'Failed to create Nagad payment' }, { status: 500 })
  }
}
