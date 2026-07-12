export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateInvoice } from '@/lib/invoice'

// ============================================================================
// POST /api/payments/webhook
// Receives callbacks from bKash and Nagad payment gateways.
// Detects provider from body shape, verifies if credentials available,
// updates Payment + Transaction records, sends confirmation email.
// ============================================================================

// --- Config (lazy import to avoid edge-runtime issues) ---
function getBkashConfig() {
  return {
    appKey:     process.env.BKASH_APP_KEY     || '',
    appSecret:  process.env.BKASH_APP_SECRET  || '',
    username:   process.env.BKASH_USERNAME    || '',
    password:   process.env.BKASH_PASSWORD    || '',
    verifyUrl:  process.env.BKASH_VERIFY_URL   || 'https://partner.bka.sh/v1.2.0-beta/payment/verify',
    isConfigured: !!(process.env.BKASH_APP_KEY && process.env.BKASH_APP_SECRET && process.env.BKASH_USERNAME),
  }
}

function getNagadConfig() {
  return {
    merchantId:     process.env.NAGAD_MERCHANT_ID  || '',
    merchantKey:   process.env.NAGAD_MERCHANT_KEY || '',
    verifyUrl:     process.env.NAGAD_VERIFY_URL   || 'https://api.nagad.com/merchant/verify',
    isConfigured:  !!(process.env.NAGAD_MERCHANT_ID && process.env.NAGAD_MERCHANT_KEY),
  }
}

// --- bKash token helper ---
async function getBkashToken(cfg: ReturnType<typeof getBkashConfig>): Promise<string | null> {
  try {
    const res = await fetch('https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/Checkout/Token/Grant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_key:    cfg.appKey,
        app_secret: cfg.appSecret,
        username:   cfg.username,
        password:   cfg.password,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.id_token || null
  } catch {
    return null
  }
}

// --- bKash payment verification ---
async function verifyBkashPayment(
  paymentId: string,
  cfg: ReturnType<typeof getBkashConfig>,
): Promise<{ success: boolean; status?: string; amount?: string }> {
  const token = await getBkashToken(cfg)
  if (!token) return { success: false }

  try {
    const res = await fetch(cfg.verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': token,
        'X-Verify':     paymentId, // bKash uses payment_id as verification key
      },
      body: JSON.stringify({ payment_id: paymentId }),
    })
    if (!res.ok) return { success: false }
    const data = await res.json()
    return {
      success: data.statusCode === '0000',
      status:  data.paymentStatus || data.status,
      amount:  data.amount,
    }
  } catch {
    return { success: false }
  }
}

// --- Nagad payment verification ---
async function verifyNagadPayment(
  paymentRefId: string,
  cfg: ReturnType<typeof getNagadConfig>,
): Promise<{ success: boolean; status?: string; amount?: string }> {
  if (!cfg.isConfigured) return { success: false }

  try {
    // Nagad verify endpoint requires merchant credentials as query params
    const url = `${cfg.verifyUrl}?merchantId=${cfg.merchantId}&paymentRefId=${paymentRefId}`
    const res = await fetch(url, {
      headers: { 'Authorization': cfg.merchantKey },
    })
    if (!res.ok) return { success: false }
    const data = await res.json()
    return {
      success: data.status === 'SUCCESS' || data.status === 'Complete',
      status:  data.status,
      amount:  data.amount,
    }
  } catch {
    return { success: false }
  }
}

// --- Detect provider from body shape ---
function detectProvider(body: Record<string, unknown>): 'bkash' | 'nagad' | 'unknown' {
  if (body.payment_id) return 'bkash'          // bKash sends payment_id
  if (body.additional_data || body.merchantId) return 'nagad'
  return 'unknown'
}

// --- Map gateway status to DB status ---
function mapStatus(gatewayStatus: string): 'completed' | 'failed' | 'pending' {
  const s = (gatewayStatus || '').toLowerCase()
  if (['completed', 'success', 'complete', '0000', 'success_type'].includes(s)) return 'completed'
  if (['failed', 'failure', 'cancel', 'canceled'].includes(s)) return 'failed'
  return 'pending'
}

// --- Send confirmation email ---
async function sendConfirmationEmail(customerId: string, paymentId: string, method: string) {
  try {
    const { sendPaymentReceiptEmail } = await import('@/lib/email')
    const customer = await prisma.customer.findUnique({ where: { id: customerId } })
    const payment  = await prisma.payment.findUnique ({ where: { id: paymentId  } })
    if (!customer || !payment) return

    await sendPaymentReceiptEmail(
      customer.email,
      customer.name,
      payment.planName || 'Subscription',
      payment.amount,
      payment.transactionId || paymentId,
      method,
    )
  } catch (err) {
    console.warn('[Payments:Webhook] Failed to send confirmation email:', err)
  }
}

// --- Main handler ---
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}) as Record<string, unknown>)
    const provider = detectProvider(body)

    // ── bKash callback ──────────────────────────────────────────────────────────
    if (provider === 'bkash') {
      const cfg       = getBkashConfig()
      const paymentId = body.payment_id  as string
      const trxId     = body.trx_id      as string
      const amount    = body.amount      as string
      const gatewayStatus = body.status  as string
      const customerPhone = body.sender_msisdn as string
      const invoice   = body.merchant_invoice as string

      // Verify with bKash API if configured
      let bkashVerified: { success: boolean; status?: string; amount?: string } = { success: false }
      if (cfg.isConfigured && paymentId) {
        bkashVerified = await verifyBkashPayment(paymentId, cfg)
        if (!bkashVerified.success) {
          console.warn('[Payments:Webhook] bKash verification failed for', paymentId)
        }
      }

      const status = mapStatus(bkashVerified.status || gatewayStatus || '')

      // Find or create customer
      let customer = customerPhone
        ? await prisma.customer.findFirst({ where: { phone: customerPhone } })
        : null

      // Upsert payment
      const payment = await prisma.payment.upsert({
        where: { transactionId: trxId || paymentId },
        update: {
          status,
          webhookSent: true,
        },
        create: {
          customerId: customer?.id || 'unknown',
          method: 'bkash',
          amount: parseFloat(amount) || 0,
          currency: 'BDT',
          status,
          transactionId: trxId || paymentId,
          planName: invoice || null,
          webhookSent: true,
        },
      })

      if (status === 'completed' && customer) {
        await activateSubscription(customer.id, payment, trxId || paymentId, 'bkash')
        await sendConfirmationEmail(customer.id, payment.id, 'bKash')
        // Generate invoice INLINE (runs on Railway where DB is reachable; Vercel can't reach Neon)
        await generateInvoice(trxId || paymentId)
      }

      return NextResponse.json({ success: true, status })
    }

    // ── Nagad callback ─────────────────────────────────────────────────────────
    if (provider === 'nagad') {
      const cfg          = getNagadConfig()
      const paymentRefId = (body.payment_ref_id || body.paymentRefId) as string
      const orderId      = body.order_id  as string
      const amount      = body.amount    as string
      const gatewayStatus = body.status  as string
      const customerPhone = body.customer_mobile as string
      const customerEmail = body.customer_email as string

      // Verify with Nagad API if configured
      let nagadVerified: { success: boolean; status?: string; amount?: string } = { success: false }
      if (cfg.isConfigured && paymentRefId) {
        nagadVerified = await verifyNagadPayment(paymentRefId, cfg)
      }

      const status = mapStatus(nagadVerified.status || gatewayStatus || '')

      // Find customer
      let customer = customerEmail
        ? await prisma.customer.findUnique({ where: { email: customerEmail } })
        : null
      if (!customer && customerPhone) {
        customer = await prisma.customer.findFirst({ where: { phone: customerPhone } })
      }

      const txId = paymentRefId || orderId

      const payment = await prisma.payment.upsert({
        where: { transactionId: txId },
        update: {
          status,
          webhookSent: true,
        },
        create: {
          customerId: customer?.id || 'unknown',
          method: 'nagad',
          amount: parseFloat(amount) || 0,
          currency: 'BDT',
          status,
          transactionId: txId,
          planName: orderId || null,
          webhookSent: true,
        },
      })

      if (status === 'completed' && customer) {
        await activateSubscription(customer.id, payment, txId, 'nagad')
        await sendConfirmationEmail(customer.id, payment.id, 'Nagad')
        // Generate invoice INLINE (runs on Railway where DB is reachable; Vercel can't reach Neon)
        await generateInvoice(txId)
      }

      return NextResponse.json({ success: true, status })
    }

    // ── Unknown provider ───────────────────────────────────────────────────────
    return NextResponse.json({ error: 'Unknown payment provider' }, { status: 400 })

  } catch (error: any) {
    console.error('[Payments:Webhook] Error:', error.message)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

// --- Activate subscription after successful payment ---
async function activateSubscription(
  customerId: string,
  payment: { planName?: string | null; amount: number; transactionId?: string | null },
  trxId: string,
  gateway: string,
) {
  const planKey = (payment.planName || 'starter').toLowerCase()
  const planMap: Record<string, { plan: string; videos: number; storage: number; price: number }> = {
    starter:  { plan: 'STARTER',  videos: 20,  storage: 10,  price: 500  },
    growth:   { plan: 'GROWTH',   videos: 30,  storage: 50,  price: 2000 },
    pro:      { plan: 'PRO',      videos: 999, storage: 100, price: 3500 },
    business: { plan: 'BUSINESS', videos: 999, storage: 500, price: 5000 },
  }
  const planInfo = planMap[planKey] || planMap['starter']

  await prisma.subscription.upsert({
    where: { customerId },
    update: {
      plan: planInfo.plan,
      status: 'active',
      videosPerMonth: planInfo.videos,
      storageGB: planInfo.storage,
      price: planInfo.price,
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    create: {
      customerId,
      plan: planInfo.plan,
      status: 'active',
      videosPerMonth: planInfo.videos,
      storageGB: planInfo.storage,
      price: planInfo.price,
      currency: 'BDT',
      billingCycle: 'monthly',
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })

  await prisma.activityLog.create({
    data: {
      customerId,
      action: 'payment_completed',
      description: `Payment of ৳${payment.amount} via ${gateway} for ${planKey} plan`,
    },
  })
}