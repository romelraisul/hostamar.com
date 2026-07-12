// =============================================================================
// lib/tenancy/tenant.ts — tenant isolation primitives (PR d).
//
// Decision A: Organization = tenant. Customer reaches its org via the
//   Membership hop. `getCurrentOrg(customerId)` resolves the tenant from the
//   customer's DEFAULT membership (or the first membership as fallback).
// Decision B: Goal / AutonomousTask / TaskRunLog are GLOBAL — no org. This
//   module is never applied to them.
//
// `getCurrentOrg` is cached in the JWT (orgId claim). On the request path,
// `getOrgFromRequest(req)` reads the `x-org-id` header (injected by middleware
// from the verified JWT) and only hits the DB when the claim is absent.
// =============================================================================
import prisma from '@/lib/prisma'

export class TenantError extends Error {
  constructor(
    public code: 'TENANT_REQUIRED' | 'NO_ORG_MEMBERSHIP' | 'TENANT_MISMATCH',
    message: string
  ) {
    super(message)
    this.name = 'TenantError'
  }
}

export async function getCurrentOrg(customerId: string): Promise<string> {
  if (!customerId) throw new TenantError('TENANT_REQUIRED', 'customerId is required to resolve tenant')

  // 1) prefer the explicit default membership
  const def = await prisma.membership.findFirst({
    where: { customerId, isDefault: true },
    select: { organizationId: true },
  })
  if (def) return def.organizationId

  // 2) fallback: first membership by id order
  const any = await prisma.membership.findFirst({
    where: { customerId },
    orderBy: { id: 'asc' },
    select: { organizationId: true },
  })
  if (any) return any.organizationId

  throw new TenantError('NO_ORG_MEMBERSHIP', `customer ${customerId} has no Membership -> cannot resolve tenant`)
}

/**
 * Merge an org scoping into any Prisma query `where`. Throws if orgId missing
 * so a missed guard fails closed instead of silently returning cross-tenant data.
 */
export function withTenant<T extends { where?: Record<string, unknown> }>(
  orgId: string,
  query: T
): T {
  if (!orgId) throw new TenantError('TENANT_REQUIRED', 'orgId required to scope query')
  return {
    ...query,
    where: { ...(query.where ?? {}), organizationId: orgId },
  } as T
}

/**
 * Resolve the org for a request. Reads the `x-org-id` header set by middleware
 * (from the verified JWT orgId claim). If absent, resolves via getCurrentOrg.
 *
 * If `expectedOrgId` is provided (e.g. a ?org= query param), the resolved org
 * must match it, else TENANT_MISMATCH (the audit's GAP-2 cross-tenant guard).
 */
export async function getOrgFromRequest(
  req: Request,
  opts: { customerId?: string; expectedOrgId?: string } = {}
): Promise<string> {
  const headerOrg = req.headers.get('x-org-id')
  let orgId = headerOrg ?? undefined

  if (!orgId && opts.customerId) {
    orgId = await getCurrentOrg(opts.customerId)
  }
  if (!orgId) {
    throw new TenantError('TENANT_REQUIRED', 'no tenant resolvable for request')
  }
  if (opts.expectedOrgId && orgId !== opts.expectedOrgId) {
    throw new TenantError('TENANT_MISMATCH', `request org ${orgId} != expected ${opts.expectedOrgId}`)
  }
  return orgId
}
