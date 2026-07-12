// GET|PUT|PATCH|DELETE /api/scim/v2/Users/[id]
// Tenant-isolated via Bearer token. DELETE is SOFT: removes the Membership only;
// the Customer and all its Videos/Payments (scoped by orgId) remain for audit.
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getScimOrg } from '@/lib/scim/auth'
import { toScimUser } from '@/lib/scim/mapper'
import { deepSanitize } from '@/lib/api/validator'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  active: z.boolean().optional(),
  name: z
    .object({ givenName: z.string().optional(), familyName: z.string().optional() })
    .optional(),
})

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  let orgId: string
  try {
    orgId = await getScimOrg(req)
  } catch (e: any) {
    return NextResponse.json({ detail: e.message }, { status: e.status ?? 401 })
  }
  const row = await membershipRow(orgId, params.id)
  if (!row) return NextResponse.json({ detail: 'not found' }, { status: 404 })
  return NextResponse.json(toScimUser(orgId, row))
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  let orgId: string
  try {
    orgId = await getScimOrg(req)
  } catch (e: any) {
    return NextResponse.json({ detail: e.message }, { status: e.status ?? 401 })
  }
  const row = await membershipRow(orgId, params.id)
  if (!row) return NextResponse.json({ detail: 'not found' }, { status: 404 })

  let raw: any
  try {
    raw = deepSanitize(await req.json(), 10_000)
  } catch (e: any) {
    return NextResponse.json({ detail: e.message }, { status: 400 })
  }
  // PUT replaces: active controls membership presence.
  await applyActive(orgId, row.customer.id, raw.active !== false)
  const updated = await membershipRow(orgId, params.id)
  return NextResponse.json(toScimUser(orgId, updated!))
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  let orgId: string
  try {
    orgId = await getScimOrg(req)
  } catch (e: any) {
    return NextResponse.json({ detail: e.message }, { status: e.status ?? 401 })
  }
  const row = await membershipRow(orgId, params.id)
  if (!row) return NextResponse.json({ detail: 'not found' }, { status: 404 })

  let raw: any
  try {
    raw = deepSanitize(await req.json(), 10_000)
  } catch (e: any) {
    return NextResponse.json({ detail: e.message }, { status: 400 })
  }
  const parsed = patchSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ detail: 'validation failed' }, { status: 400 })
  }
  if (parsed.data.active !== undefined) {
    await applyActive(orgId, row.customer.id, parsed.data.active)
  }
  if (parsed.data.name) {
    const given = parsed.data.name.givenName?.trim()
    const family = parsed.data.name.familyName?.trim()
    if (given || family) {
      const existing = row.customer.name || row.customer.email
      const [g0, ...rest] = existing.split(' ')
      const f0 = rest.join(' ')
      const newName = [given ?? g0, family ?? f0].filter(Boolean).join(' ')
      await prisma.customer.update({ where: { id: row.customer.id }, data: { name: newName } })
    }
  }
  const updated = await membershipRow(orgId, params.id)
  return NextResponse.json(toScimUser(orgId, updated!))
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  let orgId: string
  try {
    orgId = await getScimOrg(req)
  } catch (e: any) {
    return NextResponse.json({ detail: e.message }, { status: e.status ?? 401 })
  }
  const row = await membershipRow(orgId, params.id)
  if (!row) return NextResponse.json({ detail: 'not found' }, { status: 404 })

  // SOFT deprovision: remove membership only. Customer + Videos/Payments stay for audit.
  await prisma.membership.delete({
    where: { customerId_organizationId: { customerId: row.customer.id, organizationId: orgId } },
  })
  return new NextResponse(null, { status: 204 })
}

// ---- helpers ----

async function membershipRow(orgId: string, customerId: string) {
  const m = await prisma.membership.findUnique({
    where: { customerId_organizationId: { customerId, organizationId: orgId } },
    include: { customer: true },
  })
  if (!m) return null
  return { customer: m.customer, hasMembership: true }
}

// Ensure membership presence matches `active` without hard-deleting the customer.
async function applyActive(orgId: string, customerId: string, active: boolean) {
  const existing = await prisma.membership.findUnique({
    where: { customerId_organizationId: { customerId, organizationId: orgId } },
  })
  if (active && !existing) {
    const hasAny = await prisma.membership.count({ where: { customerId } })
    await prisma.membership.create({
      data: { customerId, organizationId: orgId, isDefault: hasAny === 0, role: 'member' },
    })
  } else if (!active && existing) {
    await prisma.membership.delete({
      where: { customerId_organizationId: { customerId, organizationId: orgId } },
    })
  }
}
