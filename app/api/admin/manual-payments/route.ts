import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * Admin: list pending manual payments awaiting verification.
 *
 * GET /api/admin/manual-payments
 * auth: Authorization: Bearer <ADMIN_TOKEN>
 *
 * Returns all Payment rows with status='pending', newest first.
 * Phase 0.3 admin tool — until we have a proper admin UI, this is a
 * single-row viewer for the operator.
 */

export async function GET(request: Request) {
  const auth = request.headers.get('authorization') || ''
  const expected = process.env.ADMIN_API_TOKEN
  if (!expected) {
    return NextResponse.json(
      { error: 'Admin API disabled — set ADMIN_API_TOKEN env var' },
      { status: 503 }
    )
  }
  if (!auth.startsWith('Bearer ') || auth.slice(7) !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rows = await prisma.payment.findMany({
    where: { status: 'pending' },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return NextResponse.json({
    count: rows.length,
    payments: rows.map((r) => ({
      id: r.id,
      customerId: r.customerId,
      method: r.method,
      amount: r.amount,
      currency: r.currency,
      transactionId: r.transactionId,
      planName: r.planName,
      createdAt: r.createdAt.toISOString(),
    })),
  })
}
