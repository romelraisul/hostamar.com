// GET /api/scim/v2/Groups
// Minimal SCIM Groups: one group per organization, members = its customers.
// Okta/Azure group push maps to this single org group.
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getScimOrg } from '@/lib/scim/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  let orgId: string
  try {
    orgId = await getScimOrg(req)
  } catch (e: any) {
    return NextResponse.json({ detail: e.message }, { status: e.status ?? 401 })
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      members: { include: { customer: { select: { id: true, email: true } } } },
    },
  })
  if (!org) return NextResponse.json({ detail: 'org not found' }, { status: 404 })

  const group = {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
    id: org.id,
    displayName: org.name,
    members: org.members.map((m) => ({ value: m.customer.id, display: m.customer.email })),
    meta: { resourceType: 'Group', location: `/scim/v2/Groups/${org.id}` },
  }

  return NextResponse.json({
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:ListResponse'],
    totalResults: 1,
    Resources: [group],
  })
}
