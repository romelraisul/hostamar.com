import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth-config'
import { verifyToken } from './auth'

export type AuthUser = {
  id: string
  email: string
  name: string
}

/**
 * Get the authenticated user from the request.
 * Checks both NextAuth session and custom JWT (cookie/header).
 */
export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
  // Method 1: NextAuth session (for SSR / app routes)
  const session = await getServerSession(authOptions)
  if (session?.user?.id) {
    return {
      id: session.user.id as string,
      email: session.user.email as string,
      name: session.user.name as string,
    }
  }

  // Method 2: Custom JWT from Authorization header
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const payload = verifyToken(token)
    if (payload?.id) {
      return { id: payload.id, email: payload.email, name: payload.name }
    }
  }

  // Method 3: Custom JWT from auth_token cookie
  const cookieToken = req.cookies.get('auth_token')?.value
  if (cookieToken) {
    const payload = verifyToken(cookieToken)
    if (payload?.id) {
      return { id: payload.id, email: payload.email, name: payload.name }
    }
  }

  // NOTE: x-user-* headers are NOT trusted — client can forge them.
  // Middleware sets them after verifying JWT, but we must not trust them
  // in Node. All auth is via verifyToken above. Headers removed to close forgery.
  return null
}
