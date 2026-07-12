// ============================================================================
// SSO session — mint the app's own `auth_token` cookie after SAML login.
//
// The app authenticates via a `jsonwebtoken` HS256 token in the `auth_token`
// cookie (see lib/auth.ts signToken + middleware verifyTokenEdge). SAML users
// MUST get that exact cookie or middleware will bounce them to /login.
// We add an `ssoProvider` claim so middleware can enforce SSO per org.
// SECURITY: server-only. Never import in a client component.
// ============================================================================
import jwt from 'jsonwebtoken'
import type { NextResponse } from 'next/server'
import type { Customer } from '@prisma/client'

const JWT_SECRET = process.env.JWT_SECRET || 'hostamar-jwt-secret-change-in-production'
const MAX_AGE = 60 * 60 * 24 * 7 // 7 days, matches lib/auth.ts

export function signSsoToken(customer: Customer, ssoEnforcedTenant?: string): string {
  return jwt.sign(
    {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      role: customer.role || 'customer',
      ssoProvider: customer.ssoProvider || undefined,
      // The org whose SSO issued this session (set when ssoEnforced).
      ssoEnforcedTenant: ssoEnforcedTenant || undefined,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
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
