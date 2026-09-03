export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'
import { telegramConfigured } from '@/lib/telegram/client'
import { uploadFileToChannel } from '@/lib/telegram/upload'
import { splitBufferIntoChunks, sha256 } from '@/lib/telegram/chunk'

/**
 * POST /api/drive/upload — V34 Hostamar Drive.
 *
 * Multipart: file + optional folderId. Auth: auth_token cookie (owner).
 *
 * Flow: SHA256 dedup (hash hit → return existing id, zero re-upload) →
 * ≤2GB single message → Telegram channel → DriveFile row.
 * >2GB: 1.9GB chunk messages sharing chunkGroupId.
 *
 * NOTE (honest limit, surfaced in the UI): Vercel request bodies cap at
 * ~4.5MB — big uploads must target the VPS deployment
 * (https://vps.hostamar.com/api/drive/upload) or the migration script,
 * which speaks MTProto directly. Small files work from anywhere.
 */
export async function POST(req: NextRequest) {
  try {
    if (!telegramConfigured()) {
      return NextResponse.json(
        { error: 'Drive not configured — TG_API_ID/HASH/SESSION/CHANNEL env missing', code: 'DRIVE_UNCONFIGURED' },
        { status: 503 },
      )
    }
    const token = req.cookies.get('auth_token')?.value
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload?.id) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    const ownerId = String(payload.id)

    const form = await req.formData().catch(() => null)
    if (!form) return NextResponse.json({ error: 'bad multipart' }, { status: 400 })
    const file = form.get('file') as File | null
    const folderId = (form.get('folderId') as string | null) || null
    if (!file || file.size === 0) return NextResponse.json({ error: 'file required' }, { status: 400 })

    const buf = Buffer.from(await file.arrayBuffer())
    const fileName = file.name || 'unnamed'
    const mimeType = file.type || 'application/octet-stream'
    const channelId = String(process.env.TG_CHANNEL_ID)

    // 1) dedup
    const hash = sha256(buf)
    const existing = await prisma.driveFile.findFirst({
      where: { ownerId, fileHash: hash },
      select: { id: true, fileName: true, fileSize: true },
    })
    if (existing) {
      return NextResponse.json({
        ok: true, deduped: true, id: existing.id,
        fileName: existing.fileName, fileSize: String(existing.fileSize),
      })
    }

    // 2) upload (single or chunked)
    const caption = `${fileName} | ${ownerId} | ${hash}`
    if (buf.length > 2 * 1024 * 1024 * 1024) {
      // chunked path — one DriveFile row per part, first part is the head
      const chunkGroupId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
      const parts = splitBufferIntoChunks(buf)
      let headRowId = ''
      for (let i = 0; i < parts.length; i++) {
        const up = await uploadFileToChannel(parts[i], `${fileName}.part${i}`, `${caption} [chunk ${i + 1}/${parts.length}]`)
        const row = await prisma.driveFile.create({
          data: {
            ownerId, folderId, fileName: i === 0 ? fileName : `${fileName}.part${i}`,
            fileSize: BigInt(parts[i].length), mimeType,
            fileHash: i === 0 ? hash : null,
            telegramChannelId: channelId, telegramMessageId: up.messageId, telegramFileId: up.fileId,
            chunkCount: parts.length, chunkGroupId,
          },
        })
        if (i === 0) headRowId = row.id
      }
      return NextResponse.json({
        ok: true, id: headRowId, fileName, fileSize: String(buf.length),
        chunked: true, chunkCount: parts.length,
      })
    }

    const up = await uploadFileToChannel(buf, fileName, caption)
    const row = await prisma.driveFile.create({
      data: {
        ownerId, folderId, fileName, fileSize: BigInt(buf.length), mimeType,
        fileHash: hash,
        telegramChannelId: channelId, telegramMessageId: up.messageId, telegramFileId: up.fileId,
        chunkCount: 1,
      },
    })
    return NextResponse.json({
      ok: true, id: row.id, fileName, fileSize: String(buf.length), messageId: up.messageId,
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Drive upload failed', detail: String(e?.message || e).slice(0, 200) },
      { status: 500 },
    )
  }
}
