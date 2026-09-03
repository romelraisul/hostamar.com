export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

/**
 * POST /api/drive/folder — create a folder. DELETE — remove (children kept,
 * files keep folderId dangling-safe via SET NULL FK).
 */
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('auth_token')?.value
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload?.id) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    const ownerId = String(payload.id)

    const body = await req.json().catch(() => ({}))
    const name = String(body.name || '').trim().slice(0, 200)
    const parentId = body.parentId ? String(body.parentId) : null
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

    if (parentId) {
      const parent = await prisma.driveFolder.findFirst({ where: { id: parentId, ownerId }, select: { id: true } })
      if (!parent) return NextResponse.json({ error: 'Parent folder not found' }, { status: 404 })
    }
    const folder = await prisma.driveFolder.create({ data: { ownerId, name, parentId } })
    return NextResponse.json({ ok: true, id: folder.id, name: folder.name })
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Folder create failed', detail: String(e?.message || e).slice(0, 200) },
      { status: 500 },
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = req.cookies.get('auth_token')?.value
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload?.id) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    const ownerId = String(payload.id)
    const id = req.nextUrl.searchParams.get('id') || ''
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const folder = await prisma.driveFolder.findFirst({ where: { id, ownerId } })
    if (!folder) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    // children re-root to this folder's parent (app-level, one hop)
    await prisma.driveFolder.updateMany({
      where: { parentId: id, ownerId }, data: { parentId: folder.parentId },
    })
    await prisma.driveFile.updateMany({ where: { folderId: id, ownerId }, data: { folderId: folder.parentId } })
    await prisma.driveFolder.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Folder delete failed', detail: String(e?.message || e).slice(0, 200) },
      { status: 500 },
    )
  }
}
