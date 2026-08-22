export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensurePersonalPaymentSchema } from '@/lib/payments/personal'

/**
 * POST /api/admin/payments/verifications/[id]/reject
 * Admin rejects a PENDING TrxID submission. No credits granted.
 * Body (optional): { note?: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin(req)
    await ensurePersonalPaymentSchema()

    const v = await prisma.paymentVerification.findUnique({ where: { id: params.id } })
    if (!v) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    }
    if (v.status === 'VERIFIED') {
      return NextResponse.json({ error: 'ALREADY_VERIFIED', message: 'Cannot reject a verified payment.' }, { status: 409 })
    }
    if (v.status === 'REJECTED') {
      return NextResponse.json({ error: 'ALREADY_REJECTED' }, { status: 409 })
    }

    const body = await req.json().catch(() => ({}))
    const note = body.note ? String(body.note).slice(0, 500) : null

    await prisma.paymentVerification.update({
      where: { id: v.id },
      data: { status: 'REJECTED', reviewedBy: admin.email, reviewNote: note },
    })

    return NextResponse.json({
      ok: true,
      verificationId: v.id,
      status: 'REJECTED',
      message: 'Payment rejected. No credits granted.',
    })
  } catch (err: any) {
    const status = err?.cause?.status || 500
    if (status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('[admin reject] error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
