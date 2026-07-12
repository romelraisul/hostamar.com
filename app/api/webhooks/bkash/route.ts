// GET /api/webhooks/bkash — bKash redirect target after the customer pays.
// Per bKash docs this is a GET with ?paymentID=...&status=... We DO NOT trust
// the query alone: we call bKash executePayment() to verify the real status,
// then mark the Payment paid + emit billing.payment.succeeded.
// Server-to-server / cross-site redirect: in selfGuardedPaths (no session cookie).
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { executePayment, validatePaymentId } from '@/lib/payment/bkash'
import { validateBody, toErrorResponse, deepSanitize } from '@/lib/api/validator'
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit'
import { inngest } from '@/inngest/client'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({
  paymentID: z.string(),
  status: z.string().optional(),
  trxID: z.string().optional(),
})

export async function GET(req: NextRequest) {
  // rate-limit: reuse the webhook bucket (200/min) like other webhooks.
  const rl = await checkRateLimit(getClientIp(req), RATE_LIMITS.bkashWebhook, '/api/webhooks/bkash', 'GET')
  if (!rl.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })

  const raw = Object.fromEntries(req.nextUrl.searchParams.entries())
  let body: z.infer<typeof schema>
  try {
    body = await validateBody(req, schema, 4096)
  } catch (e) {
    return NextResponse.redirect(new URL('/billing/error?reason=invalid', req.nextUrl.origin))
  }
  const clean = deepSanitize(body) as z.infer<typeof schema>

  if (!validatePaymentId(clean.paymentID)) {
    return NextResponse.redirect(new URL('/billing/error?reason=bad_payment', req.nextUrl.origin))
  }

  // Look up the pending Payment by bKash paymentID (providerPaymentId).
  const payment = await prisma.payment.findFirst({
    where: { providerPaymentId: clean.paymentID, status: 'pending' },
  })
  if (!payment) {
    // Already handled or unknown — don't double-credit. Send to success if paid.
    const existing = await prisma.payment.findFirst({ where: { providerPaymentId: clean.paymentID } })
    if (existing?.status === 'paid') {
      return NextResponse.redirect(new URL('/billing/success?invoice=' + (existing.invoiceNumber || ''), req.nextUrl.origin))
    }
    return NextResponse.redirect(new URL('/billing/error?reason=not_found', req.nextUrl.origin))
  }

  try {
    const result = await executePayment(clean.paymentID)
    if (result.status !== 'Completed' && result.status !== 'success') {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'failed' } }).catch(() => undefined)
      return NextResponse.redirect(new URL('/billing/error?reason=unpaid', req.nextUrl.origin))
    }

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'paid',
        transactionId: result.trxID,
        invoiceNumber: result.merchantInvoiceNumber || payment.invoiceNumber,
        updatedAt: new Date(),
      },
    })

    // Emit billing.payment.succeeded -> Inngest measures MRR + milestone.
    await inngest
      .send({
        name: 'billing/payment.succeeded' as any,
        data: {
          orgId: updated.organizationId,
          customerId: updated.customerId,
          amount: updated.amount,
          plan: updated.planName,
          invoiceNumber: updated.invoiceNumber,
          paymentId: updated.id,
        },
      })
      .catch((e) => console.error('[bkash] inngest.send failed', e))

    return NextResponse.redirect(
      new URL('/billing/success?invoice=' + (updated.invoiceNumber || ''), req.nextUrl.origin)
    )
  } catch (e: any) {
    console.error('[bkash] execute failed', e)
    return NextResponse.redirect(new URL('/billing/error?reason=execute_failed', req.nextUrl.origin))
  }
}
