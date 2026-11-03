import { createHmac, timingSafeEqual } from 'node:crypto'

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || 'hostamar-docker-local-dev-secret-2026'

export interface VerifyPayload {
  id: string
  email: string
  name: string
  role?: string
  orgId?: string
  ssoProvider?: string
  ssoEnforcedTenant?: string
}

function b64urlDecode(str: string): string {
  if (!str || typeof str !== 'string') throw new Error('invalid b64')
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  return Buffer.from(str, 'base64').toString('utf-8')
}

export function verifyToken(token: unknown): VerifyPayload | null {
  if (!token) return null
  if (typeof token !== 'string') return null
  if (token.length < 10) return null
  try {
    const parts = token.split('.')
    if (!parts || parts.length !== 3) return null
    const [h, p, s] = parts
    if (!h || !p || !s) return null
    const expectedSig = createHmac('sha256', JWT_SECRET).update(`${h}.${p}`).digest('base64url')
    if (s.length !== expectedSig.length) return null
    if (!timingSafeEqual(Buffer.from(s), Buffer.from(expectedSig))) return null
    const payloadStr = b64urlDecode(p)
    if (!payloadStr) return null
    const payload = JSON.parse(payloadStr)
    if (!payload || !payload.id) return null
    return payload as VerifyPayload
  } catch {
    return null
  }
}

export function signToken(payload: Omit<VerifyPayload, 'orgId' | 'ssoProvider' | 'ssoEnforcedTenant'> & { 
  orgId?: string; 
  ssoProvider?: string; 
  ssoEnforcedTenant?: string 
}, extra?: Record<string, any>): string {
  try {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
    const body = Buffer.from(JSON.stringify({ ...payload, ...(extra || {}), iat: Math.floor(Date.now() / 1000) })).toString('base64url')
    const sig = createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url')
    return `${header}.${body}.${sig}`
  } catch {
    return ''
  }
}

export async function comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  const bcrypt = (await import('bcryptjs')).default
  return bcrypt.compare(plainPassword, hashedPassword)
}

export type AuthPayload = VerifyPayload
