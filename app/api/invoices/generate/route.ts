export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { generateInvoice } from '@/lib/invoice'

/**
 * POST /api/invoices/generate
 * Body: { orderId: string }  (orderId = Payment.transactionId)
 *
 * Thin HTTP wrapper around lib/invoice.generateInvoice. NOTE: this route only
 * works where the DB is reachable. On Vercel the DATABASE_URL points to Neon
 * which Vercel cannot reach, so the webhook calls generateInvoice() INLINE on
 * Railway instead of hitting this route cross-service. Kept for manual/admin use.
 */
export async function POST(req: NextRequest) {
  try {
    const { orderId } = (await req.json()) as { orderId?: string }
    if (!orderId) {
      return NextResponse.json({ error: 'orderId required' }, { status: 400 })
    }
    const result = await generateInvoice(orderId)
    if (!result) {
      return NextResponse.json({ error: 'Invoice not generated (payment missing/incomplete or DB unreachable)' }, { status: 404 })
    }
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[Invoice:Generate] error:', err?.message || err)
    return NextResponse.json({ error: 'Invoice generation failed' }, { status: 500 })
  }
}