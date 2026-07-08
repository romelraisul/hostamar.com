import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { v4 as uuidv4 } from 'uuid'

// ============================================================================
// POST /api/payments/bkash/create
// Initiates a bKash payment via their API (if BKASH_APP_KEY is set)
// or returns a mock payment URL for local/testing environments.
// ============================================================================

const BKASH_CHECKOUT_URL = process.env.BKASH_CHECKOUT_URL || 'https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/Checkout/create'
const BKASH_APP_KEY    = process.env.BKASH_APP_KEY     || ''
const BKASH_APP_SECRET = process.env.BKASH_APP_SECRET  || ''
const BKASH_USERNAME   = process.env.BKASH_USERNAME    || ''
const BKASH_PASSWORD   = process.env.BKASH_PASSWORD    || ''
const IS_SANDBOX       = process.env.BKASH_ENVIRONMENT  !== 'production'

const BKASH_IS_CONFIGURED = !!(BKASH_APP_KEY && BKASH_APP_SECRET && BKASH_USERNAME)

// ── Get bKash auth token ────────────────────────────────────────────────────
async function getBkashToken(): Promise<string | null> {
  try {
    const res = await fetch('https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/Checkout/Token/Grant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_key:    BKASH_APP_KEY,
        app_secret: BKASH_APP_SECRET,
        username:   BKASH_USERNAME,
        password:   BKASH_PASSWORD,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.id_token || null
  } catch {
    return null
  }
}

// ── Create bKash checkout session ───────────────────────────────────────────
async function createBkashCheckout(params: {
  amount: number
  merchantInvoice: string
  intent: string
  merchantAssociationId?: string
}): Promise<{ success: boolean; paymentUrl?: string; paymentId?: string; error?: string }> {
  const token = await getBkashToken()
  if (!token) return { success: false, error: 'Could not obtain bKash token' }

  try {
    const res = await fetch(BKASH_CHECKOUT_URL, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': token,
        'X-Verify':      'empty',
      },
      body: JSON.stringify({
        app_key:                BKASH_APP_KEY,
        request_id:             params.merchantInvoice,
        amount:                 String(params.amount),
        currency:               'BDT',
        merchant_invoice:       params.merchantInvoice,
        intent:                 params.intent,
        merchant_association_id: params.merchantAssociationId || '',
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      return { success: false, error: `bKash error ${res.status}: ${text}` }
    }

    const data = await res.json()
    return {
      success:    true,
      paymentUrl: data.bkashURL || data.payment_url || data.redirectUrl,
      paymentId:  data.payment_id || data.trx_id,
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ── Credits per plan ────────────────────────────────────────────────────────
const CREDITS_MAP: Record<string, number> = {
  starter: 10, growth: 30, pro: 100,
}

// ── Main handler ─────────────────────────────────────────────────────────────
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

    const planKey  = (planName || 'starter').toLowerCase()
    const credits  = CREDITS_MAP[planKey] || 10
    const invoice  = `HOSTAMAR-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`
    const returnUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/payments/webhook`

    // ── Real bKash API mode ─────────────────────────────────────────────────
    if (BKASH_IS_CONFIGURED) {
      const result = await createBkashCheckout({
        amount:          Number(amount),
        merchantInvoice: invoice,
        intent:          'sale',
      })

      if (!result.success) {
        return NextResponse.json({ error: result.error || 'bKash create failed' }, { status: 502 })
      }

      // Create pending payment record
      const payment = await prisma.payment.create({
        data: {
          customerId,
          method:       'bkash',
          amount:       Number(amount),
          currency:     'BDT',
          status:       'pending',
          transactionId: result.paymentId || invoice,
          planName:     planKey,
        },
      })

      return NextResponse.json({
        success:      true,
        payment_url:  result.paymentUrl,
        transaction_id: result.paymentId || invoice,
        invoice,
        mode:         'bkash_api',
      })
    }

    // ── Mock mode for testing / unconfigured environments ──────────────────
    const mockTrxId = `MOCK-BKASH-${Date.now()}`
    await prisma.payment.create({
      data: {
        customerId,
        method:       'bkash',
        amount:       Number(amount),
        currency:     'BDT',
        status:       'pending',
        transactionId: mockTrxId,
        planName:     planKey,
      },
    })

    const mockPaymentUrl = `http://localhost:3000/api/payments/bkash/mock?trxId=${mockTrxId}&amount=${amount}&invoice=${invoice}`

    return NextResponse.json({
      success:      true,
      payment_url:  mockPaymentUrl,
      transaction_id: mockTrxId,
      invoice,
      mode:         'mock',
      message:      'bKash not configured — using mock payment URL for testing',
    })
  } catch (error: any) {
    console.error('[Payments:bKash:Create]', error.message)
    return NextResponse.json({ error: 'Failed to create bKash payment' }, { status: 500 })
  }
}