export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensurePersonalPaymentSchema, expireStaleVerifications } from '@/lib/payments/personal'

/**
 * GET /api/admin/payments/verifications?status=PENDING
 * Admin: list personal-payment TrxID submissions (default PENDING).
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    await ensurePersonalPaymentSchema()
    await expireStaleVerifications().catch(() => {})

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'PENDING'
    const take = Math.min(Number(searchParams.get('take')) || 50, 200)

    const where = status === 'ALL' ? {} : { status }
    const items = await prisma.paymentVerification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      include: { customer: { select: { id: true, email: true, name: true } } },
    })

    return NextResponse.json({
      ok: true,
      count: items.length,
      verifications: items.map((v) => ({
        id: v.id,
        customerId: v.customerId,
        customerEmail: v.customer.email,
        customerName: v.customer.name,
        method: v.method,
        amount: v.amount,
        senderNumber: v.senderNumber,
        trxId: v.trxId,
        plan: v.plan,
        credits: v.credits,
        status: v.status,
        smsMatched: v.smsMatched,
        createdAt: v.createdAt,
        expiresAt: v.expiresAt,
      })),
    })
  } catch (err: any) {
    const status = err?.cause?.status || 500
    if (status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('[admin verifications] error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
