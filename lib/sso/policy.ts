// ============================================================================
// Pure SSO policy — JIT provisioning, membership, profile mapping, enforcement.
// Kept free of Jackson/HTTP so it can be unit-tested deterministically.
// ============================================================================
import type { Customer } from '@prisma/client'

export interface SamlProfile {
  email: string
  firstName?: string
  lastName?: string
  // Raw NameID (the SAML subject)
  nameId?: string
}

export const DEFAULT_ATTRIBUTE_MAP = {
  email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
  firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
  lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
}

// Map raw SAML claims -> our profile using the tenant's attributeMapping.
// `claims` is the parsed assertion (Jackson flattens to a key/value bag).
export function mapProfile(claims: Record<string, any>, mapping: Record<string, string> = DEFAULT_ATTRIBUTE_MAP): SamlProfile {
  const get = (key?: string): string | undefined => {
    if (!key) return undefined
    const v = claims[key]
    return Array.isArray(v) ? (v[0] as string) : (v as string | undefined)
  }
  const email = get(mapping.email)
  if (!email) {
    throw new Error('SAML assertion missing email claim')
  }
  return {
    email,
    firstName: get(mapping.firstName),
    lastName: get(mapping.lastName),
    nameId: claims['nameID'] || claims['nameId'] || get(mapping.email),
  }
}

import { prisma } from '@/lib/prisma'

export interface JitResult {
  customer: Customer
  isNew: boolean
  membershipCreated: boolean
  orgSlug: string
}

// Just-In-Time provisioning: find-or-create Customer by email, link Membership.
export async function jitProvision(profile: SamlProfile, tenant: string): Promise<JitResult> {
  const org = await prisma.organization.findUnique({ where: { slug: tenant } })
  if (!org) throw new Error(`Unknown tenant: ${tenant}`)

  const existing = await prisma.customer.findUnique({ where: { email: profile.email } })
  let customer = existing
  let isNew = false
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        email: profile.email,
        name: [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.email,
        // SAML users have no password; a random unusable hash satisfies NOT NULL.
        password: `saml-no-password-${crypto.randomUUID()}`,
        emailVerified: new Date(),
        ssoId: profile.nameId || profile.email,
        ssoProvider: `saml:${tenant}`,
      },
    })
    isNew = true
  } else if (!customer.ssoProvider) {
    // Existing password user now logging in via SAML — stamp SSO identity.
    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: { ssoId: profile.nameId || profile.email, ssoProvider: `saml:${tenant}` },
    })
  }

  const existingMembership = await prisma.membership.findUnique({
    where: { customerId_organizationId: { customerId: customer.id, organizationId: org.id } },
  })
  let membershipCreated = false
  if (!existingMembership) {
    await prisma.membership.create({
      data: { customerId: customer.id, organizationId: org.id, role: 'member' },
    })
    membershipCreated = true
  }

  return { customer, isNew, membershipCreated, orgSlug: tenant }
}

// Enforcement: if the org enforces SSO, only a `saml:<slug>` session may enter.
export function isSsoEnforcedSession(org: { slug: string; ssoEnforced: boolean }, ssoProvider?: string | null): boolean {
  if (!org.ssoEnforced) return false
  return ssoProvider === `saml:${org.slug}`
}
