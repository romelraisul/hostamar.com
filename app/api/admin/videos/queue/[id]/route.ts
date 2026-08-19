// PATCH /api/admin/videos/queue/[id] — update queue item
// DELETE /api/admin/videos/queue/[id] — remove queue item
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req)
    const body = await req.json().catch(() => ({}))
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    const existing = await prisma.videoQueue.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Queue item not found' }, { status: 404 })

    const allowed: Record<string, any> = {}
    if (typeof body.status === 'string') allowed.status = body.status
    if (typeof body.priority === 'number') allowed.priority = Math.max(0, Math.min(10, body.priority))
    if (typeof body.topic === 'string' && body.topic.trim()) allowed.topic = body.topic.trim()
    if (typeof body.error === 'string') allowed.error = body.error.slice(0, 1000)
    if (typeof body.renderStatus === 'string') allowed.renderStatus = body.renderStatus
    if (typeof body.renderError === 'string') allowed.renderError = body.renderError.slice(0, 1000)
    if (typeof body.videoUrl === 'string') allowed.videoUrl = body.videoUrl
    if (typeof body.thumbnailUrl === 'string') allowed.thumbnailUrl = body.thumbnailUrl
    if (typeof body.videoId === 'string') allowed.videoId = body.videoId
    if (typeof body.customerId === 'string') allowed.customerId = body.customerId
    if (typeof body.attempts === 'number') allowed.attempts = body.attempts
    if (typeof body.maxAttempts === 'number') allowed.maxAttempts = body.maxAttempts
    if (body.processedAt === true) allowed.processedAt = new Date()
    if (typeof body.type === 'string') allowed.type = body.type

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
    }

    const updated = await prisma.videoQueue.update({
      where: { id: params.id },
      data: allowed,
      include: {
        customer: { select: { id: true, email: true, name: true } },
      },
    })

    return NextResponse.json({ ok: true, queue: updated })
  } catch (error: any) {
    const status = error?.cause?.status || 500
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req)
    const existing = await prisma.videoQueue.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Queue item not found' }, { status: 404 })

    await prisma.videoQueue.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    const status = error?.cause?.status || 500
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status })
  }
}
