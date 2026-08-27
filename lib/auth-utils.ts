import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || (process.env.NODE_ENV==='production' ? (()=>{throw new Error('JWT_SECRET/NEXTAUTH_SECRET missing')})() : 'hostamar-jwt-secret-change-in-production')

export async function comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword)
}

export function signToken(
  payload: { id: string; email: string; name: string; role?: string },
  extra?: Record<string, unknown>
): string {
  return jwt.sign({ ...payload, ...(extra || {}) }, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): { id: string; email: string; name: string; role?: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; email: string; name: string; role?: string }
  } catch {
    return null
  }
}
