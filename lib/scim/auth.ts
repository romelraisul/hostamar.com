// ============================================================================
// lib/scim/auth.ts — SCIM 2.0 bearer-token authentication (server-only).
//
// SCIM endpoints are server-to-server (Okta/Entra SCIM client). There is no
// session cookie, so the request carries `Authorization: Bearer <ScimToken>`.
// The token IS the tenant: we map it to a single organizationId. This keeps
// SCIM strictly tenant-isolated — a token from org A can never read org B.
//
// SECURITY: never import in a client component.
// ============================================================================
import { prisma } from '@/lib/prisma'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import type { NextRequest } from 'next/server'

export class ScimAuthError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ScimAuthError'
  }
}

/**
 * Resolve the organizationId for a SCIM request from its Bearer token.
 * Throws ScimAuthError (401/403) on missing/invalid token.
 * Enforces the shared `tools.run` rate limit (20/min) via checkRateLimit.
 */
export async function getScimOrg(req: NextRequest | Request): Promise<string> {
  // Rate-limit SCIM traffic (reuse the shared 20/min bucket from validation PR).
  const rl = await checkRateLimit(getClientIp(req), RATE_LIMITS.toolsRun, '/api/scim/v2', 'SCIM')
  if (!rl.allowed) {
    throw new ScimAuthError(429, 'rate limit exceeded')
  }

  const header = req.headers.get('authorization') || req.headers.get('Authorization')
  if (!header) throw new ScimAuthError(401, 'missing authorization header')
  const [scheme, token] = header.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    throw new ScimAuthError(401, 'invalid authorization scheme')
  }

  const rec = await prisma.scimToken.findUnique({ where: { token } })
  if (!rec) throw new ScimAuthError(401, 'invalid scim token')
  return rec.organizationId
}
