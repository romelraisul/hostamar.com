import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { NextRequest } from 'next/server'

const JWT_SECRET=(process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || (process.env.NEXT_PHASE || process.env.CI ? 'jwt-secret-absent-at-build-time' : (process.env.NODE_ENV==='production' ? (()=>{throw new Error('JWT_SECRET/NEXTAUTH_SECRET missing')})() : 'hostamar-jwt-secret-change-in-production'))) as string

export async function comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword)
}

export function signToken(
  payload: { id: string; email: string; name: string; role?: string },
  extra?: Record<string, unknown>
): string {
  return jwt.sign({ ...payload, ...(extra || {}) }, JWT_SECRET, { expiresIn: '7d' })
}

// verifyToken carries an optional orgId claim (tenant cache from PR d).
export interface VerifyPayload {
  id: string
  email: string
  name: string
  role?: string
  orgId?: string
}

export function verifyToken(token: string): VerifyPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as VerifyPayload
  } catch {
    return null
  }
}

// Re-sign a verified payload with a resolved orgId (call once per session, cache in JWT).
export function signTokenWithOrg(
  payload: VerifyPayload,
  orgId: string
): string {
  return signToken(
    { id: payload.id, email: payload.email, name: payload.name, role: payload.role },
    { orgId }
  )
}

type AuthUser = {
  id: string
  name: string
  email: string
  phone?: string | null
  role?: string
  customer: any
}

async function findCustomerById(id: string) {
  try {
    return await prisma.customer.findUnique({ where: { id } })
  } catch (error) {
    const message = String((error as any)?.message || '')
    if (message.includes('customerId')) {
      const rows = await prisma.$queryRaw<any[]>`
        SELECT id, email, name, phone, "role"
        FROM "Customer"
        WHERE id = ${id}
        LIMIT 1;
      `
      return rows[0] || null
    }
    throw error
  }
}

async function findCustomerByEmail(email: string) {
  try {
    return await prisma.customer.findUnique({ where: { email } })
  } catch (error) {
    const message = String((error as any)?.message || '')
    if (message.includes('customerId')) {
      const rows = await prisma.$queryRaw<any[]>`
        SELECT id, email, name, phone, "role"
        FROM "Customer"
        WHERE email = ${email}
        LIMIT 1;
      `
      return rows[0] || null
    }
    throw error
  }
}

export async function getAuthUser(req?: NextRequest): Promise<AuthUser | null> {
  let candidate: AuthUser | null = null

  const session = await getServerSession(authOptions)
  if (session?.user?.email) {
    const customer = await findCustomerByEmail(session.user.email)
    if (customer) {
      candidate = {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone ?? undefined,
        role: (customer.role || 'customer').toLowerCase(),
        customer,
      }
      return candidate
    }
  }

  // FIX (v5): when called from a server component PAGE (no req passed), read
  // the auth_token cookie via next/headers cookies(). Before this, JWT-cookie
  // users (login via /api/auth/login) had no NextAuth session → getAuthUser
  // returned null → every /dashboard page redirected to /login. This is the
  // root cause of the chat/game/ide → /login bug report.
  let requestRef: NextRequest | null = req ?? null
  if (!requestRef) {
    try {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const cookieToken = cookieStore.get('auth_token')?.value
      if (cookieToken) {
        // Minimal NextRequest-shaped shim carrying only the cookie getter
        requestRef = {
          headers: { get: (_: string) => '' },
          cookies: { get: (name: string) => (name === 'auth_token' ? { value: cookieToken } : undefined) },
        } as unknown as NextRequest
      }
    } catch { /* cookies() unavailable in this context — fall through */ }
  }

  if (requestRef) {
    let token = (requestRef.headers.get('authorization') || '').replace('Bearer ', '').trim()
    if (!token) {
      token = requestRef.cookies.get('auth_token')?.value || ''
    }
    if (token) {
      const payload = verifyToken(token)
      if (payload?.id) {
        const customer = await findCustomerById(payload.id)
        if (customer) {
          candidate = {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone ?? undefined,
            role: (customer.role || payload.role || 'customer').toLowerCase(),
            customer,
          }
          return candidate
        }
      }
    }

    // x-user-* headers NOT trusted — must verify JWT. Removed header forgery path.
  }

  return null
}

export async function requireAdmin(req?: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    throw new Error('Unauthorized', { cause: { status: 401 } })
  }
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    throw new Error('Forbidden', { cause: { status: 403 } })
  }
  return user
}
