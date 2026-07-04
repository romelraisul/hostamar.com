import { NextRequest, NextResponse } from 'next/server'

// Track request metrics for Prometheus
import { incrementRequestCount } from '@/lib/metrics-store'

async function verifyTokenEdge(token: string): Promise<{ id: string; email: string; name: string; role?: string } | null> {
  try {
    const secret = process.env.NEXTAUTH_SECRET
    if (!secret || !token) return null

    // Decode the JWT payload without verification (just read contents)
    const parts = token.split('.')
    if (parts.length !== 3) return null

    // Use base64url decode compatible with Edge Runtime
    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=')
    const payload = JSON.parse(atob(padded))

    // Check expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) return null

    // Return payload if it matches expected shape
    if (payload.id && payload.email) {
      return {
        id: String(payload.id),
        email: String(payload.email),
        name: String(payload.name || ''),
        role: String(payload.role || 'customer'),
      }
    }
    return null
  } catch {
    return null
  }
}
export async function middleware(request: NextRequest) {
  // Check for custom JWT auth token (set by /api/auth/login)
  const authToken = request.cookies.get('auth_token')?.value
  const { pathname } = request.nextUrl

  // Track API request metrics (skip metrics endpoint to avoid recursion)
  if (pathname.startsWith('/api/') && pathname !== '/api/metrics') {
    incrementRequestCount(request.method, pathname)
  }

  // Static assets — always allow
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/manifest.json') ||
    pathname.startsWith('/opengraph-image')
  ) {
    return NextResponse.next()
  }

  // Public API paths — no auth needed (include all NextAuth endpoints + custom auth + video public APIs)
  const publicApiPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/health',
    '/api/auth/signup',
    '/api/auth/forgot-password',
    '/api/auth/forgot',
    '/api/auth/reset',
    '/api/auth/reset-password',
    '/api/bootstrap-admin',
    '/api/storage',
    '/api/metrics',
    '/api/auth/providers',
    '/api/auth/callback',
    '/api/auth/signin',
    '/api/auth/signout',
    '/api/auth/csrf',
    '/api/auth/session',
    '/api/admin',
    '/api/ai/videos/generate',
    '/api/video/status',
    '/api/dashboard/videos',
    '/api/game/balance',
    '/api/game/spin',
    '/api/ai/browser/search',
    '/api/browser/proxy',
    '/api/browser/screenshot',
    '/api/browser/summarize',
  ]
  if (publicApiPaths.some((ap) => pathname.startsWith(ap))) {
    return NextResponse.next()
  }

  // Public page paths — no auth needed
  const publicPaths = ['/', '/login', '/signup', '/pricing', '/about', '/contact', '/privacy', '/terms', '/blog', '/generate', '/ai-browser', '/ide']
  for (const p of publicPaths) {
    if (pathname === p || pathname.startsWith(p + '/')) {
      return NextResponse.next()
    }
  }

  // API routes — validate token
  if (pathname.startsWith('/api/')) {
    if (!authToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const payload = await verifyTokenEdge(authToken)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.id)
    requestHeaders.set('x-user-email', payload.email)
    requestHeaders.set('x-user-name', payload.name)
    return NextResponse.next({
      request: { headers: requestHeaders },
    })
  }

  // Protected pages — redirect to login
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
    if (!authToken) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    const payload = await verifyTokenEdge(authToken)
    if (!payload) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    // /admin area requires elevated role
    if (pathname.startsWith('/admin') && payload.role !== 'admin' && payload.role !== 'superadmin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|static/|favicon.ico|manifest.json|opengraph-image).*)']
}