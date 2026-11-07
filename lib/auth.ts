import type { NextRequest } from 'next/server'
import { createClient } from '@libsql/client/web'
import { signToken, comparePassword, verifyToken as verifyTokenBase } from '@/lib/auth-utils'

export { signToken, comparePassword }

export interface VerifyPayload {
  id: string
  email: string
  name: string
  role?: string
  orgId?: string
  ssoProvider?: string
  ssoEnforcedTenant?: string
}

export function verifyToken(token: unknown): VerifyPayload | null {
  return verifyTokenBase(token)
}

export function signTokenWithOrg(
  payload: VerifyPayload,
  orgId: string
): string {
  return signToken(payload, { orgId })
}

type AuthUser = {
  id: string
  name: string
  email: string
  phone?: string | null
  role?: string
  customer: any
}

function getTursoClient() {
  const url = (process.env.TURSO_DATABASE_URL || '').replace(/^libsql:\/\//, 'https://')
  const authToken = process.env.TURSO_AUTH_TOKEN || ''
  if (!url) throw new Error('TURSO_DATABASE_URL not configured')
  return createClient({ url, authToken })
}

function getString(row: any, key: string): string {
  const val = row[key]
  return val === null || val === undefined ? '' : String(val)
}

function getPhone(row: any): string | null {
  const val = row['phone']
  return val === null || val === undefined ? null : String(val)
}

async function findCustomerById(id: string) {
  try {
    const client = getTursoClient()
    const result = await client.execute({
      sql: 'SELECT id, email, name, phone, "role" FROM "Customer" WHERE id = ? LIMIT 1',
      args: [id],
    })
    return result.rows[0] || null
  } catch (e) {
    // During build, database may not be accessible — return null to allow build to proceed
    console.warn('[build] Database query failed, returning null:', e instanceof Error ? e.message : e)
    return null
  }
}

async function findCustomerByEmail(email: string) {
  try {
    const client = getTursoClient()
    const result = await client.execute({
      sql: 'SELECT id, email, name, phone, "role" FROM "Customer" WHERE email = ? LIMIT 1',
      args: [email],
    })
    return result.rows[0] || null
  } catch (e) {
    console.warn('[build] Database query failed, returning null:', e instanceof Error ? e.message : e)
    return null
  }
}

export async function getAuthUser(req?: NextRequest): Promise<AuthUser | null> {
  let requestRef: NextRequest | null = req ?? null
  if (!requestRef) {
    try {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const cookieToken = cookieStore.get('auth_token')?.value
      if (cookieToken) {
        requestRef = {
          headers: { get: (_: string) => '' },
          cookies: { get: (name: string) => (name === 'auth_token' ? { value: cookieToken } : undefined) },
        } as unknown as NextRequest
      }
    } catch { /* fall through */ }
  }

  if (requestRef) {
    const authHeader = (requestRef.headers.get('authorization') || '')
    let token = authHeader.replace('Bearer ', '').trim()
    if (!token) {
      token = requestRef.cookies.get('auth_token')?.value || ''
    }
    if (authHeader.startsWith('Bearer hk_live_')) {
      const { validateApiKey } = await import('./apikey')
      const apiKey = await validateApiKey(authHeader.slice(7).trim()).catch(() => null)
      if (apiKey?.customer) {
        return {
          id: apiKey.customer.id,
          name: apiKey.customer.name,
          email: apiKey.customer.email,
          role: 'customer',
          customer: apiKey.customer,
        }
      }
    }
    if (token) {
      const payload = verifyToken(token)
      if (payload?.id) {
        const customer = await findCustomerById(payload.id)
        if (customer) {
          return {
            id: getString(customer, 'id'),
            name: getString(customer, 'name'),
            email: getString(customer, 'email'),
            phone: getPhone(customer),
            role: (getString(customer, 'role') || payload.role || 'customer').toLowerCase(),
            customer,
          }
        }
      }
    }
  }

  return null
}

export async function requireAdmin(req: NextRequest): Promise<AuthUser> {
  const user = await getAuthUser(req)
  if (!user) {
    throw new Error('UNAUTHORIZED', { cause: { status: 401 } })
  }
  if (user.role !== 'admin' && user.role !== 'ADMIN' && user.role !== 'superadmin') {
    throw new Error('FORBIDDEN: admin only', { cause: { status: 403 } })
  }
  return user
}