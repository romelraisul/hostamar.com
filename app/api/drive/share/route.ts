export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

/**
 * POST /api/drive/share — mint a 1h share token for a file (owner only).
 * GET /api/drive/share?id= — (unused; token is returned once, not listed).
 * Revoke = mint again (replaces) or DELETE the file.
 */
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('auth_token')?.value
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload?.id) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    const ownerId = String(payload.id)

    const body = await req.json().catch(() => ({}))
    const id = String(body.id || '')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const file = await prisma.driveFile.findFirst({ where: { id, ownerId }, select: { id: true, chunkGroupId: true } })
    if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (file.chunkGroupId) {
      return NextResponse.json({ error: 'Chunked files do not support share links yet' }, { status: 400 })
    }

    const shareToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 16)
    const shareTokenExpires = new Date(Date.now() + 60 * 60 * 1000) // 1h
    await prisma.driveFile.update({ where: { id }, data: { shareToken, shareTokenExpires } })
    return NextResponse.json({
      ok: true,
      url: `/drive/s/${id}?token=${shareToken}`,
      expiresAt: shareTokenExpires.toISOString(),
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Share failed', detail: String(e?.message || e).slice(0, 200) },
      { status: 500 },
    )
  }
}
