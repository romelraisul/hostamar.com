import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import prisma from '@/lib/prisma'
import { comparePassword, signToken, verifyToken } from '@/lib/auth-utils'

export { comparePassword, signToken, verifyToken }

/**
 * Returns the authenticated user, supporting THREE auth paths:
 *
 *   1. NextAuth session cookie (`next-auth.session-token`) — set by next-auth
 *      callbacks in auth-config.ts. The canonical path used by middleware and
 *      app/api/auth/login etc.
 *
 *   2. Custom `auth_token` cookie — set by app/api/auth/login route directly.
 *      Some signup/register flows emit this; we honour it as fallback so the
 *      dashboard banner still works when only this cookie exists.
 *
 *   3. Bearer header `Authorization: Bearer <token>` — useful for api calls.
 *
 * Returns null if no path yields a valid customer.
 */
export async function getAuthUser() {
  // First try: NextAuth session (canonical)
  const session = await getServerSession(authOptions)
  if (session?.user?.email) {
    const customer = await prisma.customer.findUnique({
      where: { email: session.user.email },
    })
    if (customer) {
      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        customer,
      }
    }
  }

  // Second try: custom 'auth_token' cookie (set by /api/auth/login)
  const { cookies, headers } = await import('next/headers')
  try {
    const cookieStore = await cookies()
    const tokenCookie = cookieStore.get('auth_token')?.value
    if (tokenCookie) {
      const verified = verifyToken(tokenCookie)
      if (verified?.id) {
        const customer = await prisma.customer.findUnique({
          where: { id: verified.id },
        })
        if (customer) {
          return {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            customer,
          }
        }
      }
    }
  } catch {
    // cookies() can throw in non-route contexts; ignore
  }

  // Third try: Authorization: Bearer <token>
  try {
    const hdrStore = await headers()
    const auth = hdrStore.get('authorization')
    if (auth?.startsWith('Bearer ')) {
      const verified = verifyToken(auth.slice(7))
      if (verified?.id) {
        const customer = await prisma.customer.findUnique({
          where: { id: verified.id },
        })
        if (customer) {
          return {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            customer,
          }
        }
      }
    }
  } catch {
    // headers() can throw in non-route contexts; ignore
  }

  return null
}

export type AuthUser = Exclude<Awaited<ReturnType<typeof getAuthUser>>, null>
