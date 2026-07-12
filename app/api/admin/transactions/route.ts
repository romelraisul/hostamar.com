export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/transactions?status=pending_verification&limit=100
 *
 * Lists `Transaction` rows from the bKash personal flow that created via
 * `/api/payment/bkash-verify`. Distinct from `/api/admin/payments` which
 * only shows `Payment` rows. The admin UI calls this to surface
 * not-yet-approved TrxIDs so they can be flipped to completed via
 * `/api/admin/payments/approve/[transactionId]`.
 *
 * Query filters:
 *   - status: 'pending' | 'pending_verification' | 'completed' | 'failed' | 'all' (default 'pending_verification')
 *   - limit: 1..500 (default 100)
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)

    const { searchParams } = new URL(req.url)
    const status = String(searchParams.get('status') || 'pending_verification')
    const limit = Math.min(500, Math.max(1, Number(searchParams.get('limit') || 100)))

    const where: any = {}
    if (status !== 'all') {
      where.status = status
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        customer: { select: { email: true, name: true } },
      },
    })

    return NextResponse.json({
      success: true,
      status,
      count: transactions.length,
      transactions: transactions.map((t: any) => ({
        id: t.id,
        customerId: t.customerId,
        customerEmail: t.customer?.email ?? null,
        customerName: t.customer?.name ?? null,
        amount: typeof t.amount === 'object' && t.amount !== null ? Number(t.amount) : Number(t.amount),
        currency: t.currency,
        status: t.status,
        gateway: t.gateway,
        gatewayTrxId: t.gatewayTrxId,
        videoPackage: t.videoPackage,
        creditsAdded: Number(t.creditsAdded || 0),
        createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
        approvePath: `/api/admin/payments/approve/${encodeURIComponent(t.id)}`,
      })),
    })
  } catch (error: any) {
    const status = error?.cause?.status || 500
    return NextResponse.json(
      { success: false, error: error?.message || 'list failed' },
      { status },
    )
  }
}