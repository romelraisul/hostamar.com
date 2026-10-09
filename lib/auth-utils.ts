import { createHmac, timingSafeEqual } from 'node:crypto'

// ─────────────────────────────────────────────────────────────────────────────
// Cold-init fix (2026-10-09, worker cbad910e → see docs/1102_WORKER_LIMITS.md)
//
// Before: `import jwt from 'jsonwebtoken'` + `import bcrypt from 'bcryptjs'` at
// module scope. Measured module-eval cost: jsonwebtoken 32.1 ms, bcryptjs 2.4 ms.
// Both were reachable from every route that imports this file (191 built route
// chunks pulled this graph). On a fresh Worker isolate serving its first request
// that eval sits in the request's critical path — cold init measured 400-700 ms,
// and the residual kill was cpuTime 417 ms on a cold /api/drive/list isolate
// (1102 "Worker exceeded CPU time limit"). That is the shape of the last 0.8% of
// cold requests dying, not of steady-state compute.
//
// After: signToken/verifyToken are plain HS256 over node:crypto (native in
// workerd behind nodejs_compat, ~1 ms to load, measured 0.0 ms in Node vs
// jsonwebtoken's 11.9-32.1 ms) and stay SYNC, so all 34 verifyToken callers are
// untouched. bcryptjs is imported lazily inside comparePassword (already async)
// instead of at module scope.
//
// Wire-format compatibility: HS256 = base64url(header) + "." + base64url(payload)
// + "." + base64url(HMAC-SHA256(...)), unpadded — identical to jsonwebtoken's
// default for a string secret. Tokens already in users' `auth_token` cookies
// (signed by jsonwebtoken) verify unchanged, and tokens we mint verify with
// jsonwebtoken. Proven both directions in tests/auth-token-interop.mjs.
// ─────────────────────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || (process.env.NEXT_PHASE || process.env.CI ? 'jwt-secret-absent-at-build-time' : (process.env.NODE_ENV==='production' ? (()=>{throw new Error('JWT_SECRET/NEXTAUTH_SECRET missing')})() : 'hostamar-jwt-secret-change-in-production'))

export interface AuthPayload {
  id: string
  email: string
  name: string
  role?: string
}

const b64u = (input: string | Uint8Array): string =>
  Buffer.from(input as any)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

const unb64u = (s: string): Buffer =>
  Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64')

const HEADER = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))

const hmac = (data: string): Buffer =>
  createHmac('sha256', JWT_SECRET).update(data).digest()

export async function comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  const bcrypt = (await import('bcryptjs')).default
  return bcrypt.compare(plainPassword, hashedPassword)
}

export function signToken(payload: AuthPayload, extra?: Record<string, unknown>): string {
  const now = Math.floor(Date.now() / 1000)
  const body = b64u(JSON.stringify({ ...payload, ...(extra || {}), iat: now, exp: now + 7 * 24 * 3600 }))
  const signingInput = `${HEADER}.${body}`
  return `${signingInput}.${b64u(hmac(signingInput))}`
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [header, body, signature] = parts
    if (!header || !body || !signature) return null
    // Always HMAC-SHA256 regardless of the header's `alg` — an attacker-supplied
    // header can never downgrade us (no alg:none / RS256 confusion).
    const given = unb64u(signature)
    const expected = hmac(`${header}.${body}`)
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
    const payload = JSON.parse(unb64u(body).toString('utf8')) as AuthPayload & { exp?: number }
    if (typeof payload?.exp === 'number' && Date.now() / 1000 >= payload.exp) return null
    return payload
  } catch {
    return null
  }
}
