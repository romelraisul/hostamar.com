// GET /api/admin/videos/[id] — video detail
// PATCH /api/admin/videos/[id] — update video fields
// DELETE /api/admin/videos/[id] — delete video
// POST /api/admin/videos/[id]/retry — retry failed video
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req)
    const video = await prisma.video.findUnique({
      where: { id: params.id },
      include: {
        customer: {
          select: { id: true, email: true, name: true, phone: true, role: true },
        },
      },
    })
    if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    return NextResponse.json(video)
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

    const existing = await prisma.video.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Video not found' }, { status: 404 })

    const allowed: Record<string, any> = {}
    if (typeof body.title === 'string' && body.title.trim()) allowed.title = body.title.trim()
    if (typeof body.topic === 'string') allowed.topic = body.topic.trim()
    if (typeof body.status === 'string') allowed.status = body.status
    if (typeof body.url === 'string') allowed.url = body.url
    if (typeof body.thumbnailUrl === 'string') allowed.thumbnailUrl = body.thumbnailUrl
    if (typeof body.language === 'string') allowed.language = body.language
    if (typeof body.resolution === 'string') allowed.resolution = body.resolution
    if (typeof body.description === 'string') allowed.description = body.description
    if (typeof body.prompt === 'string') allowed.prompt = body.prompt
    if (typeof body.script === 'string') allowed.script = body.script

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
    }

    const updated = await prisma.video.update({
      where: { id: params.id },
      data: allowed,
      include: {
        customer: { select: { id: true, email: true, name: true } },
      },
    })

    return NextResponse.json({ ok: true, video: updated })
  } catch (error: any) {
    const status = error?.cause?.status || 500
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req)
    const existing = await prisma.video.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Video not found' }, { status: 404 })

    await prisma.video.delete({ where: { id: params.id } })
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

    if (action === 'retry') {
      const video = await prisma.video.findUnique({ where: { id: params.id } })
      if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 })

      const updated = await prisma.video.update({
        where: { id: params.id },
        data: {
          status: 'processing',
        },
        include: {
          customer: { select: { id: true, email: true, name: true } },
        },
      })

      return NextResponse.json({ ok: true, video: updated })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    const status = error?.cause?.status || 500
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status })
  }
}
