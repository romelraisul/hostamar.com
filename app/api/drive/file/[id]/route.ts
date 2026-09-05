export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'
import { telegramConfigured } from '@/lib/telegram/client'
import { deleteMessages } from '@/lib/telegram/download'

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

    const totalSize = Number(rows.reduce((a: bigint | number, r) => BigInt(a) + BigInt(r.fileSize), 0))
    const contentType = file.mimeType || 'application/octet-stream'
    const disposition = `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`
    const baseHeaders: Record<string, string> = {
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Content-Disposition': disposition,
      'Cache-Control': 'private, max-age=0, must-revalidate',
    }

    // Parse Range: bytes=start-end (end optional). Single-chunk + Range →
    // MTProto offset/limit fetch (only the requested bytes cross the wire).
    // Multi-chunk or no-Range → sequential stream of full bytes.
    const range = req.headers.get('range')
    const m = range?.match(/bytes=(\d+)-(\d*)/)
    const start = m ? Number(m[1]) : 0
    const end = m ? (m[2] ? Math.min(Number(m[2]), totalSize - 1) : totalSize - 1) : totalSize - 1
    if (start >= totalSize || start > end) {
      return new NextResponse(null, { status: 416, headers: { 'Content-Range': `bytes */${totalSize}` } })
    }

    const { iterMessageBytes } = await import('@/lib/telegram/download')

    if (m && rows.length === 1) {
      // FAST PATH — Range on single message: read exactly [start, end].
      // iterDownload returns whole 512KB chunks; slice to the exact byte span.
      const parts: Buffer[] = []
      let got = 0
      await iterMessageBytes(rows[0].telegramMessageId, (chunk) => {
        if (got >= end - start + 1) return
        parts.push(chunk)
        got += chunk.length
      }, { offset: start, limit: end - start + 1 })
      const slice = Buffer.concat(parts).subarray(0, end - start + 1)
      return new NextResponse(new Uint8Array(slice), {
        status: 206,
        headers: {
          ...baseHeaders,
          'Content-Range': `bytes ${start}-${end}/${totalSize}`,
          'Content-Length': String(slice.length),
        },
      })
    }

    if (m && rows.length > 1) {
      // Range across a chunk group — stream all parts, slice in-flight.
      const sliceLen = end - start + 1
      let pos = 0
      let emitted = 0
      const parts: Buffer[] = []
      for (const r of rows) {
        const partSize = Number(r.fileSize)
        if (pos + partSize <= start) { pos += partSize; continue }
        const withinStart = Math.max(0, start - pos)
        await iterMessageBytes(r.telegramMessageId, (chunk, off) => {
          const abs = pos + off
          const from = Math.max(abs, start)
          const to = Math.min(abs + chunk.length - 1, end)
          if (from <= to && emitted < sliceLen) {
            parts.push(chunk.subarray(from - abs, to - abs + 1))
            emitted += to - from + 1
          }
        })
        pos += partSize
        if (emitted >= sliceLen) break
      }
      const slice = Buffer.concat(parts)
      return new NextResponse(new Uint8Array(slice), {
        status: 206,
        headers: {
          ...baseHeaders,
          'Content-Range': `bytes ${start}-${end}/${totalSize}`,
          'Content-Length': String(slice.length),
        },
      })
    }

    // No Range — full sequential stream of all chunks (single or multi).
    const parts: Buffer[] = []
    for (const r of rows) {
      await iterMessageBytes(r.telegramMessageId, (chunk) => { parts.push(chunk) })
    }
    const full = Buffer.concat(parts)
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
