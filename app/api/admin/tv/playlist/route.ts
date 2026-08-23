export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureSchema } from '@/lib/ensure-schema'
import { getOrCreateDefaultChannel } from '@/lib/tv/generator'

/**
 * GET /api/admin/tv/playlist (admin) — list items
 * POST /api/admin/tv/playlist (admin) — add video { videoId?, title, url, source? }
 * DELETE /api/admin/tv/playlist?id=xxx
 * PUT /api/admin/tv/playlist — reorder { order: [id1, id2, ...] }
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    await ensureSchema()
    const channel = await getOrCreateDefaultChannel()
    const items = await prisma.tvPlaylistItem.findMany({ where: { channelId: channel.id }, orderBy: { position: 'asc' } })
    return NextResponse.json({ ok: true, items })
  } catch (err: any) {
    const s = err?.cause?.status || 500
    if (s === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (s === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)
    await ensureSchema()
    const body = await req.json().catch(() => ({}))
    const channel = await getOrCreateDefaultChannel()
    const count = await prisma.tvPlaylistItem.count({ where: { channelId: channel.id } })
    const title = String(body.title || 'Untitled').slice(0, 200)
    const url = String(body.url || '').slice(0, 1000)
    if (!url) return NextResponse.json({ error: 'INVALID_URL' }, { status: 400 })
    const item = await prisma.tvPlaylistItem.create({
      data: {
        channelId: channel.id,
        videoId: body.videoId ? String(body.videoId) : null,
        title,
        url,
        source: String(body.source || 'generated').slice(0, 20),
        position: count,
      },
    })
    return NextResponse.json({ ok: true, item })
  } catch (err: any) {
    const s = err?.cause?.status || 500
    if (s === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (s === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin(req)
    await ensureSchema()
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'MISSING_ID' }, { status: 400 })
    await prisma.tvPlaylistItem.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    const s = err?.cause?.status || 500
    if (s === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (s === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin(req)
    await ensureSchema()
    const body = await req.json().catch(() => ({}))
    const order: string[] = Array.isArray(body.order) ? body.order : []
    if (!order.length) return NextResponse.json({ error: 'INVALID_ORDER' }, { status: 400 })
    for (let i = 0; i < order.length; i++) {
      await prisma.tvPlaylistItem.update({ where: { id: order[i] }, data: { position: i } }).catch(() => {})
    }
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    const s = err?.cause?.status || 500
    if (s === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (s === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
