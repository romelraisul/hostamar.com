// GET /api/admin/services/[id] — service detail
// PATCH /api/admin/services/[id] — update service fields
// DELETE /api/admin/services/[id] — delete service
// POST /api/admin/services/[id]/renew — extend expiry by billing cycle
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req)
    const service = await prisma.service.findUnique({
      where: { id: params.id },
      include: {
        customer: {
          select: { id: true, email: true, name: true, phone: true, role: true },
        },
      },
    })
    if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    return NextResponse.json(service)
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

    const existing = await prisma.service.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Service not found' }, { status: 404 })

    const allowed: Record<string, any> = {}
    if (typeof body.name === 'string' && body.name.trim()) allowed.name = body.name.trim()
    if (typeof body.type === 'string' && body.type.trim()) allowed.type = body.type.trim()
    if (typeof body.status === 'string') allowed.status = body.status
    if (typeof body.price === 'number') allowed.price = body.price
    if (typeof body.billingCycle === 'string') allowed.billingCycle = body.billingCycle
    if (typeof body.serverIp === 'string') allowed.serverIp = body.serverIp
    if (typeof body.serverId === 'string') allowed.serverId = body.serverId
    if (typeof body.credentials === 'string') allowed.credentials = body.credentials
    if (typeof body.specs === 'string') allowed.specs = body.specs
    if (typeof body.expiresAt === 'string') {
      const d = new Date(body.expiresAt)
      if (!isNaN(d.getTime())) allowed.expiresAt = d
    }

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
    }

    const updated = await prisma.service.update({
      where: { id: params.id },
      data: allowed,
      include: {
        customer: { select: { id: true, email: true, name: true } },
      },
    })

    return NextResponse.json({ ok: true, service: updated })
  } catch (error: any) {
    const status = error?.cause?.status || 500
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req)
    const existing = await prisma.service.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Service not found' }, { status: 404 })

    await prisma.service.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    const status = error?.cause?.status || 500
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req)
    const body = await req.json().catch(() => ({}))
    const action = req.nextUrl.searchParams.get('action')

    if (action === 'renew') {
      const service = await prisma.service.findUnique({ where: { id: params.id } })
      if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 })

      const now = new Date()
      const base = service.expiresAt && service.expiresAt > now ? service.expiresAt : now
      const cycle = service.billingCycle === 'yearly' ? 365 : service.billingCycle === 'weekly' ? 7 : 30
      const newExpiresAt = new Date(base)
      newExpiresAt.setDate(newExpiresAt.getDate() + cycle)

      const updated = await prisma.service.update({
        where: { id: params.id },
        data: { expiresAt: newExpiresAt },
        include: {
          customer: { select: { id: true, email: true, name: true } },
        },
      })

      return NextResponse.json({
        ok: true,
        service: updated,
        renewedUntil: newExpiresAt.toISOString(),
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    const status = error?.cause?.status || 500
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status })
  }
}
