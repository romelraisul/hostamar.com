export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureSchema } from '@/lib/ensure-schema'
import { env } from '@/lib/env'

/**
 * GET  /api/team — list the user's workspace(s) + members + pending invites
 * POST /api/team — create a workspace { name, slug? }
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await ensureSchema()

    const memberships = await prisma.membership.findMany({
      where: { customerId: user.id },
      include: {
        organization: {
          include: {
            members: {
              include: { customer: { select: { id: true, name: true, email: true } } },
            },
          },
        },
      },
    })

    const workspaces = await Promise.all(
      memberships.map(async (m) => {
        const invites = await prisma.teamInvite.findMany({
          where: { organizationId: m.organizationId, status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
        })
        return {
          id: m.organizationId,
          name: m.organization.name,
          slug: m.organization.slug,
          role: m.role,
          members: m.organization.members.map((mm) => ({
            id: mm.customer.id,
            name: mm.customer.name,
            email: mm.customer.email,
            role: mm.role,
          })),
          pendingInvites: invites.map((i) => ({
            id: i.id,
            email: i.email,
            role: i.role,
            createdAt: i.createdAt,
          })),
        }
      })
    )

    return NextResponse.json({ ok: true, workspaces })
  } catch (err) {
    console.error('[team] GET error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await ensureSchema()

    const body = await req.json().catch(() => ({}))
    const name = String(body.name || '').trim()
    if (!name) return NextResponse.json({ error: 'INVALID_NAME', message: 'name is required' }, { status: 400 })

    const slug =
      String(body.slug || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') ||
      name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    // Ensure unique slug
    const existing = await prisma.organization.findUnique({ where: { slug } })
    const finalSlug = existing ? `${slug}-${crypto.randomBytes(3).toString('hex')}` : slug

    const org = await prisma.organization.create({
      data: { name, slug: finalSlug },
    })

    // Creator becomes owner
    await prisma.membership.create({
      data: {
        customerId: user.id,
        organizationId: org.id,
        role: 'owner',
        isDefault: true,
      },
    })

    return NextResponse.json({
      ok: true,
      workspace: { id: org.id, name: org.name, slug: org.slug, role: 'owner' },
    })
  } catch (err) {
    console.error('[team] POST error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
