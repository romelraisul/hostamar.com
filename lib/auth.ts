import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { NextRequest } from 'next/server'

const JWT_SECRET=process.env.JWT_SECRET || 'hostamar-jwt-secret-change-in-production'

export async function comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword)
}

export function signToken(payload: { id: string; email: string; name: string; role?: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): { id: string; email: string; name: string; role?: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; email: string; name: string; role?: string }
  } catch {
    return null
  }
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

  if (req) {
    let token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim()
    if (!token) {
      token = req.cookies.get('auth_token')?.value || ''
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

    const headerId = req.headers.get('x-user-id') ?? undefined
    const headerEmail = req.headers.get('x-user-email')
    const headerName = req.headers.get('x-user-name') ?? undefined
    if (headerEmail) {
      const customer = headerId ? await findCustomerById(headerId) : null
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
      candidate = {
        id: headerId || '',
        name: headerName || '',
        email: headerEmail,
        role: 'customer',
        customer: null,
      }
      return candidate
    }
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
