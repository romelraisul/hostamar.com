// GET|POST /api/scim/v2/Users
// Tenant-isolated via Bearer token -> organizationId (lib/scim/auth.ts).
// GET supports SCIM filter `userName eq "..."`, startIndex/count, attributes.
// POST provisions a Customer + Membership from a SCIM User payload.
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getScimOrg } from '@/lib/scim/auth'
import { toScimUser } from '@/lib/scim/mapper'
import { deepSanitize } from '@/lib/api/validator'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Parse a minimal SCIM filter: only support `userName eq "email"`.
function parseUserNameFilter(filter: string | null): string | null {
  if (!filter) return null
  const m = filter.match(/userName\s+eq\s+"([^"]+)"/i)
  return m ? m[1] : null
}

const createUserSchema = z.object({
  userName: z.string().email(),
  name: z
    .object({ givenName: z.string().optional(), familyName: z.string().optional() })
    .optional(),
  active: z.boolean().optional(),
  emails: z.array(z.object({ value: z.string().email() })).optional(),
})

export async function GET(req: NextRequest) {
  let orgId: string
  try {
    orgId = await getScimOrg(req)
  } catch (e: any) {
    return NextResponse.json({ detail: e.message }, { status: e.status ?? 401 })
  }

  const url = new URL(req.url)
  const filterEmail = parseUserNameFilter(url.searchParams.get('filter'))
  const startIndex = Math.max(1, Number(url.searchParams.get('startIndex')) || 1)
  const count = Math.min(200, Math.max(1, Number(url.searchParams.get('count')) || 100))

  // Customers linked to this org via Membership. We scope by the membership hop,
  // never by a Customer.organizationId column (tenancy is Membership-based).
  const memberships = await prisma.membership.findMany({
    where: { organizationId: orgId },
    include: { customer: true },
    skip: startIndex - 1,
    take: count,
  })

  // Optional `userName eq` filter (post-filter; SCIM clients expect server filter).
  const rows = memberships
    .filter((m) => !filterEmail || m.customer.email.toLowerCase() === filterEmail.toLowerCase())
    .map((m) => ({ customer: m.customer, hasMembership: true }))

  const resources = rows.map((r) => toScimUser(orgId, r))
  return NextResponse.json({
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:ListResponse'],
    totalResults: resources.length,
    startIndex,
    itemsPerPage: resources.length,
    Resources: resources,
  })
}

export async function POST(req: NextRequest) {
  let orgId: string
  try {
    orgId = await getScimOrg(req)
  } catch (e: any) {
    return NextResponse.json({ detail: e.message }, { status: e.status ?? 401 })
  }

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ detail: 'invalid JSON' }, { status: 400 })
  }

  // Sanitize every string (reuse dcddc73 validator) before zod parse.
  let sanitized: any
  try {
    sanitized = deepSanitize(raw, 10_000)
  } catch (e: any) {
    return NextResponse.json({ detail: e.message }, { status: 400 })
  }

  const parsed = createUserSchema.safeParse(sanitized)
  if (!parsed.success) {
    return NextResponse.json(
      {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
        detail: 'validation failed',
        status: 400,
      },
      { status: 400 }
    )
  }

  const email = parsed.data.userName.toLowerCase()
  const given = parsed.data.name?.givenName?.trim() || ''
  const family = parsed.data.name?.familyName?.trim() || ''
  const displayName = [given, family].filter(Boolean).join(' ') || email
  const active = parsed.data.active !== false // default true

  // 1) find-or-create Customer by email
  const customer = await prisma.customer.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: displayName,
      password: `scim-no-password-${crypto.randomUUID()}`,
      emailVerified: new Date(),
      ssoProvider: `scim:${orgId}`,
    },
  })

  // 2) ensure Membership (isDefault = first membership for this customer)
  const existingMembership = await prisma.membership.findUnique({
    where: { customerId_organizationId: { customerId: customer.id, organizationId: orgId } },
  })
  if (!existingMembership) {
    const hasAny = await prisma.membership.count({ where: { customerId: customer.id } })
    await prisma.membership.create({
      data: {
        customerId: customer.id,
        organizationId: orgId,
        isDefault: hasAny === 0, // id ordering fallback (no createdAt on Membership)
        role: 'member',
      },
    })
  }

  // 3) if !active -> soft deprovision: remove membership (customer stays for audit)
  if (!active && existingMembership) {
    await prisma.membership.delete({
      where: { customerId_organizationId: { customerId: customer.id, organizationId: orgId } },
    })
  }

  const body = toScimUser(orgId, { customer, hasMembership: active })
  return NextResponse.json(body, {
    status: 201,
    headers: { Location: `/scim/v2/Users/${customer.id}` },
  })
}
