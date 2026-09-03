export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

/**
 * GET /api/drive/list?folderId=&q= — V34.
 * Auth: session cookie. Returns folders + files for the owner, newest first,
 * with total storage used (Telegram-backed = unlimited, shown in UI badge).
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('auth_token')?.value
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload?.id) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    const ownerId = String(payload.id)

    const folderId = req.nextUrl.searchParams.get('folderId') || null
    const q = (req.nextUrl.searchParams.get('q') || '').trim()

    if (q) {
      const files = await prisma.driveFile.findMany({
        where: { ownerId, fileName: { contains: q, mode: 'insensitive' }, chunkGroupId: null },
        orderBy: { createdAt: 'desc' }, take: 100,
        select: { id: true, fileName: true, fileSize: true, mimeType: true, folderId: true, createdAt: true },
      })
      return NextResponse.json({ ok: true, files, folders: [] })
    }

    const [folders, files, agg] = await Promise.all([
      prisma.driveFolder.findMany({
        where: { ownerId, parentId: folderId },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, parentId: true, createdAt: true },
      }),
      prisma.driveFile.findMany({
        where: { ownerId, folderId, chunkGroupId: null },
        orderBy: { createdAt: 'desc' }, take: 200,
        select: { id: true, fileName: true, fileSize: true, mimeType: true, folderId: true, createdAt: true },
      }),
      prisma.driveFile.aggregate({
        where: { ownerId, chunkGroupId: null },
        _sum: { fileSize: true },
      }),
    ])
    return NextResponse.json({
      ok: true, folders, files,
      usedBytes: String(agg._sum.fileSize || 0),
      unlimited: true, // Telegram channel storage
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Drive list failed', detail: String(e?.message || e).slice(0, 200) },
      { status: 500 },
    )
  }
}
