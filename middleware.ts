import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware for auth-related redirects.
 *
 * - Redirects /api/auth/error to /login with the error parameter
 *   (NextAuth's error handler doesn't respect pages.error properly)
 */
export function middleware(request: NextRequest) {
  const url = new URL(request.url)

  // Redirect /api/auth/error → /login?error=<type>
  if (url.pathname === '/api/auth/error' && request.method === 'GET') {
    const error = url.searchParams.get('error') || 'CredentialsSignin'
    return NextResponse.redirect(new URL(`/login?error=${error}`, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/auth/error'],
}
