export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

/**
 * POST /api/drive/move — move file to another folder (owner only).
 * Body: { id, folderId | null }
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
    const folderId = body.folderId ? String(body.folderId) : null
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const file = await prisma.driveFile.findFirst({ where: { id, ownerId }, select: { id: true } })
    if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (folderId) {
      const folder = await prisma.driveFolder.findFirst({ where: { id: folderId, ownerId }, select: { id: true } })
      if (!folder) return NextResponse.json({ error: 'Target folder not found' }, { status: 404 })
    }
    await prisma.driveFile.update({ where: { id }, data: { folderId } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Move failed', detail: String(e?.message || e).slice(0, 200) },
      { status: 500 },
    )
  }
}
