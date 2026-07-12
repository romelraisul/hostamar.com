export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { v4 as uuidv4 } from 'uuid'

// ============================================================================
// POST /api/payments/nagad/create
// Initiates a Nagad payment via their API (if NAGAD_MERCHANT_ID is set)
// or returns a mock payment URL for local/testing environments.
// ============================================================================

const NAGAD_API_BASE   = process.env.NAGAD_API_BASE   || 'https://api.nagad.com'
const NAGAD_MERCHANT_ID = process.env.NAGAD_MERCHANT_ID || ''
const NAGAD_MERCHANT_KEY = process.env.NAGAD_MERCHANT_KEY || ''
const NAGAD_IS_CONFIGURED = !!(NAGAD_MERCHANT_ID && NAGAD_MERCHANT_KEY)

// ── Get Nagad auth token ─────────────────────────────────────────────────────
async function getNagadToken(): Promise<string | null> {
  try {
    const res = await fetch(`${NAGAD_API_BASE}/merchant/merchant endpoint is different`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username:   NAGAD_MERCHANT_ID,
        password:   NAGAD_MERCHANT_KEY,
      }),
    }).catch(() => null)

    if (!res?.ok) return null
    const data = await res.json()
    return data.access_token || data.token || null
  } catch {
    return null
  }
}

// ── Create Nagad checkout session ─────────────────────────────────────────────
async function createNagadCheckout(params: {
  amount: number
  orderId: string
  customerEmail?: string
  customerMobile?: string
  returnUrl: string
}): Promise<{ success: boolean; paymentUrl?: string; paymentRefId?: string; error?: string }> {
  const token = await getNagadToken()
  if (!token) return { success: false, error: 'Could not obtain Nagad token' }

  try {
    // Nagad create payment endpoint
    const res = await fetch(`${NAGAD_API_BASE}/merchant/verify`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': token,
      },
      body: JSON.stringify({
        merchantId:     NAGAD_MERCHANT_ID,
        orderId:        params.orderId,
        amount:         String(params.amount),
        currency:       'BDT',
        customerEmail:  params.customerEmail || '',
        customerMobile: params.customerMobile || '',
        returnUrl:     params.returnUrl,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      return { success: false, error: `Nagad error ${res.status}: ${text}` }
    }

    const data = await res.json()
    return {
      success:    true,
      paymentUrl: data.payment_url || data.redirect_url,
      paymentRefId: data.payment_ref_id || data.reference_id,
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ── Credits per plan ─────────────────────────────────────────────────────────
const CREDITS_MAP: Record<string, number> = {
  starter: 10, growth: 30, pro: 100,
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { customerId, planName = 'starter', amount = 500 } = body

    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 })
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } })
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const planKey   = (planName || 'starter').toLowerCase()
    const credits   = CREDITS_MAP[planKey] || 10
    const invoice   = `HOSTAMAR-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`
    const returnUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/payments/webhook`

    // ── Real Nagad API mode ─────────────────────────────────────────────────
    if (NAGAD_IS_CONFIGURED) {
      const result = await createNagadCheckout({
        amount:         Number(amount),
        orderId:        invoice,
        customerEmail:  customer.email,
        customerMobile: customer.phone || undefined,
        returnUrl,
      })

      if (!result.success) {
        return NextResponse.json({ error: result.error || 'Nagad create failed' }, { status: 502 })
      }

      // Create pending payment record
      const payment = await prisma.payment.create({
        data: {
          customerId,
          method:        'nagad',
          amount:        Number(amount),
          currency:      'BDT',
          status:        'pending',
          transactionId: result.paymentRefId || invoice,
          planName:      planKey,
        },
      })

      return NextResponse.json({
        success:       true,
        payment_url:   result.paymentUrl,
        transaction_id: result.paymentRefId || invoice,
        invoice,
        mode:          'nagad_api',
      })
    }

    // ── Mock mode for testing / unconfigured environments ──────────────────
    const mockTrxId = `MOCK-NAGAD-${Date.now()}`
    await prisma.payment.create({
      data: {
        customerId,
        method:       'nagad',
        amount:       Number(amount),
        currency:     'BDT',
        status:       'pending',
        transactionId: mockTrxId,
        planName:     planKey,
      },
    })

    const mockPaymentUrl = `http://localhost:3000/api/payments/nagad/mock?trxId=${mockTrxId}&amount=${amount}&invoice=${invoice}`

    return NextResponse.json({
      success:       true,
      payment_url:   mockPaymentUrl,
      transaction_id: mockTrxId,
      invoice,
      mode:          'mock',
      message:       'Nagad not configured — using mock payment URL for testing',
    })
  } catch (error: any) {
    console.error('[Payments:Nagad:Create]', error.message)
    return NextResponse.json({ error: 'Failed to create Nagad payment' }, { status: 500 })
  }
}