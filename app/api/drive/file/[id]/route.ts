export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'
import { telegramConfigured } from '@/lib/telegram/client'
import { downloadMessageBuffer, deleteMessages } from '@/lib/telegram/download'

/**
 * /api/drive/file/[id] — V34 Hostamar Drive.
 *
 * GET: download/stream (owner session OR ?token= 1h share). Range supported
 * (206) for video/audio; chunk groups joined in order. Small/medium files
 * buffer in RAM (documented limit in /drive UI); the VPS deployment and the
 * migration script stream via iterMessageBytes instead.
 *
 * DELETE: remove file (and whole chunk group) from Neon + revoke the
 * Telegram messages (best-effort; the row delete is the source of truth).
 */

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const shareToken = req.nextUrl.searchParams.get('token')
    const token = req.cookies.get('auth_token')?.value
    let ownerId: string | null = null
    if (token) {
      const payload = verifyToken(token)
      if (payload?.id) ownerId = String(payload.id)
    }

    const file = await prisma.driveFile.findUnique({ where: { id }, select: {
      id: true, ownerId: true, fileName: true, fileSize: true, mimeType: true,
      chunkCount: true, chunkGroupId: true, shareToken: true, shareTokenExpires: true,
      telegramMessageId: true,
    } })
    if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const ownerMatch = ownerId && file.ownerId === ownerId
    const shareOk = Boolean(
      shareToken && file.shareToken === shareToken &&
      file.shareTokenExpires && file.shareTokenExpires.getTime() > Date.now(),
    )
    if (!ownerMatch && !shareOk) {
      return NextResponse.json({ error: 'Not found for this account' }, { status: 404 }) // IDOR-safe wording (matches videos proxy)
    }
    if (!telegramConfigured()) {
      return NextResponse.json({ error: 'Drive storage backend not configured' }, { status: 503 })
    }

    const rows = file.chunkGroupId
      ? await prisma.driveFile.findMany({
          where: { chunkGroupId: file.chunkGroupId, ownerId: file.ownerId },
          orderBy: { createdAt: 'asc' }, select: { telegramMessageId: true, fileSize: true },
        })
      : [{ telegramMessageId: file.telegramMessageId, fileSize: file.fileSize }]
    if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const buffers: Buffer[] = []
    for (const r of rows) buffers.push(await downloadMessageBuffer(r.telegramMessageId))
    const full = Buffer.concat(buffers)

    const range = req.headers.get('range')
    const baseHeaders: Record<string, string> = {
      'Content-Type': file.mimeType || 'application/octet-stream',
      'Accept-Ranges': 'bytes',
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      'Cache-Control': 'private, max-age=0, must-revalidate',
    }
    if (range) {
      const m = range.match(/bytes=(\d+)-(\d*)/)
      if (m) {
        const start = Number(m[1])
        const end = m[2] ? Math.min(Number(m[2]), full.length - 1) : full.length - 1
        if (start >= full.length || start > end) {
          return new NextResponse(null, { status: 416, headers: { 'Content-Range': `bytes */${full.length}` } })
        }
        const slice = full.subarray(start, end + 1)
        return new NextResponse(new Uint8Array(slice), {
          status: 206,
          headers: {
            ...baseHeaders,
            'Content-Range': `bytes ${start}-${end}/${full.length}`,
            'Content-Length': String(slice.length),
          },
        })
      }
    }
    return new NextResponse(new Uint8Array(full), {
      status: 200,
      headers: { ...baseHeaders, 'Content-Length': String(full.length) },
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Drive download failed', detail: String(e?.message || e).slice(0, 200) },
      { status: 500 },
    )
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const token = req.cookies.get('auth_token')?.value
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload?.id) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    const ownerId = String(payload.id)

    const file = await prisma.driveFile.findFirst({ where: { id, ownerId }, select: {
      id: true, chunkGroupId: true,
    } })
    if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    let rows: { id: string; telegramMessageId: number }[]
    if (file.chunkGroupId) {
      rows = await prisma.driveFile.findMany({
        where: { chunkGroupId: file.chunkGroupId, ownerId },
        select: { id: true, telegramMessageId: true },
        orderBy: { createdAt: 'asc' },
      })
    } else {
      const self = await prisma.driveFile.findUnique({ where: { id }, select: { id: true, telegramMessageId: true } })
      rows = self ? [{ id: self.id, telegramMessageId: self.telegramMessageId }] : []
    }

    if (telegramConfigured()) {
      try {
        await deleteMessages(rows.map((r) => r.telegramMessageId).filter(Boolean))
      } catch { /* revoke best-effort — row delete below is the source of truth */ }
    }
    await prisma.driveFile.deleteMany({
      where: { id: { in: rows.map((r) => r.id) }, ownerId },
    })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Drive delete failed', detail: String(e?.message || e).slice(0, 200) },
      { status: 500 },
    )
  }
}
