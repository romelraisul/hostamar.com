export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureSchema } from '@/lib/ensure-schema'
import { env } from '@/lib/env'

const INVITE_TTL_DAYS = 7

/**
 * POST /api/team/invite — invite a member by email.
 * Body: { organizationId, email, role? }
 * Only owner/admin of the workspace can invite.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await ensureSchema()

    const body = await req.json().catch(() => ({}))
    const organizationId = String(body.organizationId || '')
    const email = String(body.email || '').trim().toLowerCase()
    const role = body.role === 'admin' ? 'admin' : 'member'

    if (!organizationId) return NextResponse.json({ error: 'INVALID_ORG' }, { status: 400 })
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'INVALID_EMAIL' }, { status: 400 })
    }

    // Permission check: inviter must be owner/admin
    const membership = await prisma.membership.findUnique({
      where: { customerId_organizationId: { customerId: user.id, organizationId } },
    })
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Forbidden', message: 'Only owners/admins can invite.' }, { status: 403 })
    }

    // Already a member?
    const existingUser = await prisma.customer.findUnique({ where: { email } })
    if (existingUser) {
      const alreadyMember = await prisma.membership.findUnique({
        where: { customerId_organizationId: { customerId: existingUser.id, organizationId } },
      })
      if (alreadyMember) {
        return NextResponse.json({ error: 'ALREADY_MEMBER', message: 'That user is already in the workspace.' }, { status: 409 })
      }
    }

    // Duplicate pending invite?
    const dupInvite = await prisma.teamInvite.findFirst({
      where: { organizationId, email, status: 'PENDING' },
    })
    if (dupInvite) {
      return NextResponse.json({ error: 'ALREADY_INVITED', message: 'A pending invite already exists for this email.' }, { status: 409 })
    }

    const token = crypto.randomBytes(24).toString('hex')
    const invite = await prisma.teamInvite.create({
      data: {
        organizationId,
        email,
        role,
        token,
        invitedBy: user.id,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
    })

    const siteUrl = env.NEXT_PUBLIC_SITE_URL || env.NEXTAUTH_URL || 'https://hostamar.com'
    const inviteLink = `${siteUrl}/team/accept?token=${token}`

    // Best-effort email (non-fatal if SMTP unconfigured)
    try {
      const { sendTeamInviteEmail } = await import('@/lib/email')
      await sendTeamInviteEmail(email, inviteLink)
    } catch {
      /* email optional */
    }

    return NextResponse.json({
      ok: true,
      invite: { id: invite.id, email, role, inviteLink },
      message: 'Invite created. Share the invite link with the member.',
    })
  } catch (err) {
    console.error('[team/invite] error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
