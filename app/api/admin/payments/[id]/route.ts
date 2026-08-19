// GET /api/admin/payments/[id] — payment detail
// PATCH /api/admin/payments/[id] — update status / notes
// DELETE /api/admin/payments/[id] — void / refund payment
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req)
    const payment = await prisma.payment.findUnique({
      where: { id: params.id },
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true, role: true },
        },
      },
    })
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    return NextResponse.json(payment)
  } catch (error: any) {
    const status = error?.cause?.status || 500
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req)
    const body = await req.json().catch(() => ({}))
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    const existing = await prisma.payment.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

    const allowed: Record<string, any> = {}
    if (['pending', 'completed', 'failed', 'refunded', 'cancelled'].includes(body.status)) {
      allowed.status = body.status
    }
    if (typeof body.notes === 'string') allowed.notes = body.notes
    if (typeof body.transactionId === 'string') allowed.transactionId = body.transactionId
    if (typeof body.providerPaymentId === 'string') allowed.providerPaymentId = body.providerPaymentId
    if (typeof body.invoiceNumber === 'string') allowed.invoiceNumber = body.invoiceNumber

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
    }

    const updated = await prisma.payment.update({
      where: { id: params.id },
      data: allowed,
      include: {
        customer: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json({ ok: true, payment: updated })
  } catch (error: any) {
    const status = error?.cause?.status || 500
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req)
    const existing = await prisma.payment.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

    // Refund-like behavior: mark as cancelled instead of hard delete so audit trail remains.
    const updated = await prisma.payment.update({
      where: { id: params.id },
      data: { status: 'cancelled' },
    })

    return NextResponse.json({ ok: true, payment: updated })
  } catch (error: any) {
    const status = error?.cause?.status || 500
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status })
  }
}
