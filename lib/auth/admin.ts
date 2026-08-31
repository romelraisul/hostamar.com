/**
 * lib/auth/admin.ts — single admin-role helper (V17).
 * The auth-token payload is minted at login with the DB role, but tokens can
 * outlive a role change — so for MONEY-SURFACE guards we always re-check the
 * DB role (never trust the JWT claim alone).
 */
import { prisma } from '@/lib/prisma'

export async function isAdminUser(userId: string): Promise<boolean> {
  try {
    const c = await prisma.customer.findUnique({
      where: { id: userId },
      select: { role: true },
    })
    const role = (c?.role || 'customer').toLowerCase()
    return role === 'admin' || role === 'superadmin'
  } catch {
    return false
  }
}

/** Admin emails from env (comma-separated ADMIN_EMAILS), optional extra guard. */
export function adminEmailsFromEnv(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}
