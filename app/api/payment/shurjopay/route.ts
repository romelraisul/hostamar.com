// ============================================================================
// POST /api/payment/shurjopay — shurjoPay webhook / IPN handler
// ============================================================================
// shurjoPay sends a POST request to this endpoint after each payment attempt.
// This handler verifies the payment and updates the database accordingly.
//
// shurjoPay docs: https://shurjopay.com.bd/docs/webhook
//
// NOTE: For sandbox testing, use the sandbox URL:
//    Sandbox Engine: https://sandbox.shurjopay.com
//    Webhook URL to register: https://your-domain.com/api/payment/shurjopay
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { handlePaymentWebhook, isShurjoPayConfigured } from '@/lib/payment'

export async function POST(req: NextRequest) {
  try {
    // Parse body (shurjoPay sends JSON)
    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    console.log('[shurjoPay Webhook] Received:', {
      sp_order_id: body.sp_order_id,
      order_id: body.order_id,
      status: body.status,
      amount: body.amount,
      method: body.method,
    })

    // Delegate to the payment service
    const result = await handlePaymentWebhook(body)

    if (!result.success) {
      console.error('[shurjoPay Webhook] Processing failed:', result.message)
      // Always return 200 to shurjoPay (they expect a success ACK)
      return NextResponse.json({ error: result.message }, { status: 200 })
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      transaction: result.transactionId,
      payment: result.paymentId,
    })
  } catch (err: any) {
    console.error('[shurjoPay Webhook] Unexpected error:', err.message)
    // Always return 200 to prevent shurjoPay from retrying endlessly
    return NextResponse.json({ error: 'Internal error' }, { status: 200 })
  }
}

// ============================================================================
// GET /api/payment/shurjopay — health check / status
// ============================================================================
export async function GET() {
  const configured = isShurjoPayConfigured()
  return NextResponse.json({
    service: 'shurjopay',
    configured,
    mode: configured ? 'automated' : 'fallback (manual bKash)',
    sandbox: process.env.SHURJOPAY_SANDBOX !== 'false',
    docs: 'POST with shurjoPay webhook payload to process payments',
  })
}
