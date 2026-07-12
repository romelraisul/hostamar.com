export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ============================================================================
// GET /api/payments/status/[transactionId]
// Returns the status of a payment by its transaction ID.
// ============================================================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> },
) {
  try {
    const { transactionId } = await params

    if (!transactionId) {
      return NextResponse.json({ error: 'transactionId is required' }, { status: 400 })
    }

    const payment = await prisma.payment.findUnique({
      where: { transactionId },
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    return NextResponse.json({
      success:       true,
      transactionId: payment.transactionId,
      status:       payment.status,
      method:       payment.method,
      amount:       payment.amount,
      currency:     payment.currency,
      planName:     payment.planName,
      createdAt:    payment.createdAt,
      updatedAt:    payment.updatedAt,
    })
  } catch (error: any) {
    console.error('[Payments:Status]', error.message)
    return NextResponse.json({ error: 'Failed to get payment status' }, { status: 500 })
  }
}