export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureSchema } from '@/lib/ensure-schema'

/**
 * POST /api/team/accept — accept a workspace invite.
 * Body: { token }
 * The logged-in user joins the workspace the invite points to.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await ensureSchema()

    const body = await req.json().catch(() => ({}))
    const token = String(body.token || '')
    if (!token) return NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 400 })

    const invite = await prisma.teamInvite.findUnique({ where: { token } })
    if (!invite) return NextResponse.json({ error: 'NOT_FOUND', message: 'Invite not found.' }, { status: 404 })
    if (invite.status !== 'PENDING') {
      return NextResponse.json({ error: 'INVITE_USED', message: 'This invite is no longer valid.' }, { status: 409 })
    }
    if (invite.expiresAt < new Date()) {
      return NextResponse.json({ error: 'INVITE_EXPIRED', message: 'This invite has expired.' }, { status: 410 })
    }

    // Add to workspace (idempotent via unique constraint)
    await prisma.membership.upsert({
      where: { customerId_organizationId: { customerId: user.id, organizationId: invite.organizationId } },
      create: { customerId: user.id, organizationId: invite.organizationId, role: invite.role },
      update: {},
    })

    await prisma.teamInvite.update({ where: { id: invite.id }, data: { status: 'ACCEPTED' } })

    const org = await prisma.organization.findUnique({ where: { id: invite.organizationId } })
    return NextResponse.json({
      ok: true,
      workspace: { id: org?.id, name: org?.name, slug: org?.slug, role: invite.role },
      message: `You joined ${org?.name || 'the workspace'}!`,
    })
  } catch (err) {
    console.error('[team/accept] error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
