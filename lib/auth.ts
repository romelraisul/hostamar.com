import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'hostamar-jwt-secret-change-in-production'

export async function comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword)
}

export function signToken(payload: { id: string; email: string; name: string; role?: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): { id: string; email: string; name: string; role?: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; email: string; name: string }
  } catch {
    return null
  }
}

export async function getAuthUser() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return null
  }

  const customer = await prisma.customer.findUnique({
    where: { email: session.user.email },
  })

  if (!customer) {
    return null
  }

  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    customer,
  }
}

export type AuthUser = Exclude<Awaited<ReturnType<typeof getAuthUser>>, null>
