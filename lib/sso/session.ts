// ============================================================================
// SSO session — mint the app's own `auth_token` cookie after SAML login.
//
// The app authenticates via a `jsonwebtoken` HS256 token in the `auth_token`
// cookie. SAML users MUST get that exact cookie (same secret + same base claim
// shape) or middleware (verifyTokenEdge) will bounce them to /login.
//
// To guarantee byte-identical signing with the password login path, we reuse
// lib/auth.ts `signToken` (single source of truth for the JWT_SECRET). We add
// the SSO-specific claims (ssoProvider / ssoEnforcedTenant) on top so
// middleware can enforce SSO per org — verifyTokenEdge only checks the
// signature and reads `id`, so extra claims are harmless.
//
// SECURITY: server-only. Never import in a client component.
// ============================================================================
import type { NextResponse } from 'next/server'
import type { Customer } from '@prisma/client'
import { signToken } from '@/lib/auth'

const MAX_AGE = 60 * 60 * 24 * 7 // 7 days, matches lib/auth.ts

export function signSsoToken(customer: Customer, ssoEnforcedTenant?: string): string {
  return signToken(
    {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      role: customer.role || 'customer',
    },
    {
      // SSO metadata for middleware enforcement. Undefined values are dropped.
      ...(customer.ssoProvider ? { ssoProvider: customer.ssoProvider } : {}),
      ...(ssoEnforcedTenant ? { ssoEnforcedTenant } : {}),
    }
  )
}

export function setSsoSessionCookie(res: NextResponse, customer: Customer, ssoEnforcedTenant?: string): void {
  const token = signSsoToken(customer, ssoEnforcedTenant)
  res.cookies.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // IdP cross-site redirect — 'strict' would drop the cookie
    maxAge: MAX_AGE,
    path: '/',
  })
}
