// ============================================================================
// Payment Service — shurjoPay (primary) with bKash-manual fallback
// ============================================================================
// If SHURJOPAY_API_KEY is set, uses shurjoPay for automated bKash payments.
// Otherwise falls back to the existing manual bKash TrxID flow.
// ============================================================================

import { prisma } from '@/lib/prisma'

// --- Configuration ---
const SHURJOPAY_MERCHANT_ID  = process.env.SHURJOPAY_MERCHANT_ID || ''
const SHURJOPAY_API_KEY      = process.env.SHURJOPAY_API_KEY || ''
const SHURJOPAY_API_SECRET   = process.env.SHURJOPAY_API_SECRET || ''
const SHURJOPAY_SANDBOX      = process.env.SHURJOPAY_SANDBOX !== 'false' // default sandbox

const SHURJOPAY_BASE = SHURJOPAY_SANDBOX
  ? 'https://sandbox.shurjopay.com'
  : 'https://engine.shurjopay.com'

const USE_SHURJOPAY = !!(SHURJOPAY_MERCHANT_ID && SHURJOPAY_API_KEY && SHURJOPAY_API_SECRET)

// ============================================================================
// Types
// ============================================================================
export interface ShurjoPayCreateResponse {
  checkout_url: string
  amount: number
  currency: string
  sp_order_id: string
  customer_order_id: string
  status: string
}

export interface ShurjoPayVerifyResponse {
  id: number
  order_id: string
  currency: string
  amount: number
  pay_time: string
  status: string        // 'Completed', 'Pending', 'Failed', 'Canceled'
  sp_code: string
  sp_message: string
  method: string        // 'bKash', 'Nagad', 'Rocket', etc.
  bank_status: string
  customer_email: string
  customer_phone: string
  transaction_id: string
}

// ============================================================================
// Internal helpers
// ============================================================================

/** Get shurjoPay auth token */
async function getToken(): Promise<string> {
  const res = await fetch(`${SHURJOPAY_BASE}/api/get_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: SHURJOPAY_MERCHANT_ID,
      password: SHURJOPAY_API_SECRET,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`shurjoPay auth failed (${res.status}): ${text}`)
  }

  const data = await res.json()
  return data.token
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Create a shurjoPay checkout session.
 * Returns a checkout URL to redirect/bounce the user to.
 * Falls back to manual mode if shurjoPay not configured.
 */
export async function createPayment(params: {
  amount: number
  currency?: string
  customerOrderId: string   // your internal order/transaction ID
  customerName: string
  customerEmail: string
  customerPhone?: string
  customerAddress?: string
  customerCity?: string
  customerCountry?: string
  returnUrl: string         // success redirect
  cancelUrl: string         // cancel redirect
  clientIp?: string
}): Promise<{
  success: boolean
  checkoutUrl?: string
  orderId?: string
  error?: string
  mode: 'shurjopay' | 'manual'
}> {
  // --- Manual fallback ---
  if (!USE_SHURJOPAY) {
    console.log('[Payment:shurjoPay] Not configured — returning manual mode')
    return {
      success: true,
      mode: 'manual',
    }
  }

  try {
    const token = await getToken()

    const currency = params.currency || 'BDT'

    const body = {
      token,
      store_id: SHURJOPAY_MERCHANT_ID,
      prefix: 'HOSTAMAR',
      currency,
      amount: params.amount,
      order_id: params.customerOrderId,
      customer_name: params.customerName,
      customer_email: params.customerEmail,
      customer_phone: params.customerPhone || '',
      customer_address: params.customerAddress || 'N/A',
      customer_city: params.customerCity || 'Dhaka',
      customer_country: params.customerCountry || 'Bangladesh',
      client_ip: params.clientIp || '0.0.0.0',
      return_url: params.returnUrl,
      cancel_url: params.cancelUrl,
    }

    const res = await fetch(`${SHURJOPAY_BASE}/api/make_payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`shurjoPay create failed (${res.status}): ${text}`)
    }

    const data: ShurjoPayCreateResponse = await res.json()

    console.log('[Payment:shurjoPay] Order created:', data.sp_order_id)

    return {
      success: true,
      checkoutUrl: data.checkout_url,
      orderId: data.sp_order_id,
      mode: 'shurjopay',
    }
  } catch (err: any) {
    console.error('[Payment:shurjoPay] Create error:', err.message)
    return {
      success: false,
      error: err.message || 'Payment creation failed',
      mode: 'shurjopay',
    }
  }
}

/**
 * Verify a shurjoPay payment by order ID.
 * Call this from your webhook or IPN handler.
 */
export async function verifyPayment(orderId: string): Promise<{
  success: boolean
  verified: boolean
  data?: ShurjoPayVerifyResponse
  error?: string
  mode: 'shurjopay' | 'manual'
}> {
  if (!USE_SHURJOPAY) {
    return {
      success: true,
      verified: false,   // manual verification needed
      mode: 'manual',
    }
  }

  try {
    const token = await getToken()

    const res = await fetch(`${SHURJOPAY_BASE}/api/verify_payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        order_id: orderId,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`shurjoPay verify failed (${res.status}): ${text}`)
    }

    const data: ShurjoPayVerifyResponse = await res.json()

    const isCompleted = data.status === 'Completed'
    console.log('[Payment:shurjoPay] Verify result:', {
      order_id: data.order_id,
      status: data.status,
      method: data.method,
      transaction_id: data.transaction_id,
    })

    return {
      success: true,
      verified: isCompleted,
      data,
      mode: 'shurjopay',
    }
  } catch (err: any) {
    console.error('[Payment:shurjoPay] Verify error:', err.message)
    return {
      success: false,
      verified: false,
      error: err.message,
      mode: 'shurjopay',
    }
  }
}

/**
 * Handle shurjoPay webhook / IPN payload.
 * Updates Payment and Transaction records in the database.
 * Sends confirmation email on success.
 */
export async function handlePaymentWebhook(payload: any): Promise<{
  success: boolean
  message: string
  transactionId?: string
  paymentId?: string
}> {
  try {
    const {
      sp_order_id,
      order_id,
      transaction_id,
      amount,
      currency,
      status,
      method,
      sp_code,
      sp_message,
      customer_order_id,
      customer_name,
      customer_email,
      customer_phone,
      pay_time,
    } = payload

    // Determine final status
    const isSuccess = status === 'Completed' || status === 'completed' || status === 'Success'
    const isFailed = status === 'Failed' || status === 'failed' || status === 'Canceled' || status === 'canceled'

    const dbStatus = isSuccess ? 'success' : isFailed ? 'failed' : 'pending'

    // Try to find existing Transaction by customer_order_id or sp_order_id
    const existingTrx = await prisma.transaction.findFirst({
      where: {
        OR: [
          { gatewayTrxId: order_id || sp_order_id || transaction_id },
          ...(customer_order_id ? [{ id: customer_order_id }] : []),
        ],
      },
    })

    if (!existingTrx) {
      // If we don't have a pre-created transaction, try to find customer by email/phone
      let customer = customer_email
        ? await prisma.customer.findUnique({ where: { email: customer_email } })
        : null
      if (!customer && customer_phone) {
        customer = await prisma.customer.findFirst({ where: { phone: customer_phone } })
      }

      if (!customer) {
        console.warn('[Payment:shurjoPay] No customer found for webhook:', customer_email, customer_phone)
        return { success: false, message: 'Customer not found' }
      }

      // Create transaction retroactively
      const trx = await prisma.transaction.create({
        data: {
          customerId: customer.id,
          amount: parseFloat(String(amount)) || 0,
          currency: currency || 'BDT',
          status: dbStatus,
          gateway: 'shurjopay',
          gatewayTrxId: transaction_id || order_id || sp_order_id,
          cardType: method || null,
          cardBrand: sp_code || null,
        },
      })

      // Create Payment record
      const payment = await prisma.payment.create({
        data: {
          customerId: customer.id,
          method: (method || 'shurjopay').toLowerCase(),
          amount: parseFloat(String(amount)) || 0,
          currency: currency || 'BDT',
          status: dbStatus,
          transactionId: transaction_id || trx.id,
          webhookSent: true,
        },
      })

      if (isSuccess) {
        await activateSubscription(customer.id, payment, trx)
      }

      return {
        success: true,
        message: `Webhook processed — ${isSuccess ? 'completed' : dbStatus}`,
        transactionId: trx.id,
        paymentId: payment.id,
      }
    }

    // --- Existing transaction found: update it ---
    const trx = await prisma.transaction.update({
      where: { id: existingTrx.id },
      data: {
        status: dbStatus,
        gatewayTrxId: transaction_id || order_id || sp_order_id || existingTrx.gatewayTrxId,
        cardType: method || existingTrx.cardType,
        cardBrand: sp_code || existingTrx.cardBrand,
      },
    })

    // Upsert Payment record
    const payment = await prisma.payment.upsert({
      where: { transactionId: transaction_id || order_id || sp_order_id || existingTrx.id },
      update: {
        status: dbStatus,
        method: (method || 'shurjopay').toLowerCase(),
        webhookSent: true,
      },
      create: {
        customerId: trx.customerId,
        method: (method || 'shurjopay').toLowerCase(),
        amount: trx.amount,
        currency: trx.currency,
        status: dbStatus,
        transactionId: transaction_id || trx.id,
        webhookSent: true,
      },
    })

    if (isSuccess) {
      await activateSubscription(trx.customerId, payment, trx)
    }

    return {
      success: true,
      message: `Webhook processed — ${isSuccess ? 'completed' : dbStatus}`,
      transactionId: trx.id,
      paymentId: payment.id,
    }
  } catch (err: any) {
    console.error('[Payment:shurjoPay] Webhook handler error:', err.message)
    return { success: false, message: err.message || 'Webhook processing failed' }
  }
}

// ============================================================================
// Internal: activate/upgrade subscription after successful payment
// ============================================================================
async function activateSubscription(
  customerId: string,
  payment: { planName?: string | null; amount: number; transactionId?: string | null },
  transaction: { videoPackage?: string | null; creditsAdded: number; gatewayTrxId?: string | null; id: string },
) {
  const planKey = (payment.planName || transaction.videoPackage || 'starter').toLowerCase()
  const planMap: Record<string, { plan: string; videos: number; storage: number; price: number }> = {
    starter:  { plan: 'STARTER',  videos: 20,  storage: 10, price: 500 },
    growth:   { plan: 'GROWTH',   videos: 30,  storage: 50, price: 2000 },
    pro:      { plan: 'PRO',      videos: 999, storage: 100, price: 3500 },
    business: { plan: 'BUSINESS', videos: 999, storage: 500, price: 5000 },
  }
  const planInfo = planMap[planKey] || planMap['starter']

  // Activate subscription
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

  // Add credits
  const creditsToAdd = transaction.creditsAdded > 0 ? transaction.creditsAdded : planInfo.videos
  await prisma.customer.update({
    where: { id: customerId },
    data: { credits: { increment: creditsToAdd } },
  })

  // Log activity
  await prisma.activityLog.create({
    data: {
      customerId,
      action: 'payment_completed',
      description: `Payment of ৳${payment.amount} via shurjoPay for ${planKey} plan — subscription activated, ${creditsToAdd} credits added`,
    },
  })

  // Send payment confirmation email (import lazily to avoid circular deps)
  try {
    // @ts-expect-error — sendPaymentReceiptEmail may not be exported from email module
    const { sendPaymentReceiptEmail } = await import('@/lib/email')
    const customer = await prisma.customer.findUnique({ where: { id: customerId } })
    if (customer && customer.email) {
      await sendPaymentReceiptEmail(
        customer.email,
        customer.name,
        planInfo.plan,
        payment.amount,
        transaction.gatewayTrxId || payment.transactionId || 'N/A',
        'shurjoPay',
      )
    }
  } catch (emailErr) {
    console.warn('[Payment] Could not send confirmation email:', emailErr)
  }

  // Create notification
  await prisma.notification.create({
    data: {
      customerId,
      type: 'payment_verified',
      title: 'পেমেন্ট নিশ্চিত! ✅',
      message: `${creditsToAdd} ক্রেডিট আপনার অ্যাকাউন্টে যোগ হয়েছে।`,
      actionUrl: '/dashboard',
    },
  })
}

// ============================================================================
// Utility
// ============================================================================

export function isShurjoPayConfigured(): boolean {
  return USE_SHURJOPAY
}

export function getPaymentMode(): 'shurjopay_auto' | 'bkash_manual' {
  return USE_SHURJOPAY ? 'shurjopay_auto' : 'bkash_manual'
}
