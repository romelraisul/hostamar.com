// lib/scim/mapper.ts — shared SCIM <-> Hostamar Customer mapping (server-only).
import type { Customer } from '@prisma/client'

// SCIM "active" = customer has at least one Membership in this org.
export interface ScimUserRow {
  customer: Customer
  hasMembership: boolean
}

export function toScimUser(orgId: string, row: ScimUserRow): Record<string, unknown> {
  const { customer, hasMembership } = row
  const name = customer.name || customer.email
  const [givenName, ...rest] = name.split(' ')
  const familyName = rest.join(' ') || name
  return {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
    id: customer.id,
    userName: customer.email,
    active: hasMembership, // soft-deprovisioned (membership removed) => inactive
    name: { givenName, familyName },
    emails: [{ primary: true, value: customer.email }],
    groups: hasMembership ? [{ value: orgId, display: 'Hostamar' }] : [],
    meta: {
      resourceType: 'User',
      created: customer.createdAt.toISOString(),
      location: `/scim/v2/Users/${customer.id}`,
    },
  }
}
