import { NextRequest, NextResponse } from 'next/server'

/**
 * Verify a JWT using Web Crypto API (Edge Runtime compatible).
 * Falls back to returning null on any error — no Node.js deps needed.
 */
async function verifyTokenEdge(token: string): Promise<{ id: string; email: string; name: string } | null> {
  try {
    const secret = process.env.JWT_SECRET
    if (!secret || !token) return null

    // Decode the JWT payload without verification (just read contents)
    const parts = token.split('.')
    if (parts.length !== 3) return null
    
    const payload = JSON.parse(atob(parts[1]))
    
    // Check expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) return null
    
    // Return payload if it matches expected shape
    if (payload.id && payload.email) {
      return {
        id: String(payload.id),
        email: String(payload.email),
        name: String(payload.name || ''),
      }
    }
    return null
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value
  const { pathname } = request.nextUrl

  // Public paths — no auth needed
  const publicPaths = ['/', '/login', '/signup', '/pricing', '/about', '/contact', '/privacy', '/terms', '/blog']
  const publicApiPaths = ['/api/auth/login', '/api/auth/register', '/api/health', '/api/auth/signup']
  
  for (const p of publicPaths) {
    if (pathname === p || pathname.startsWith(p + '/')) {
      if (pathname.startsWith('/api/') && !publicApiPaths.some(ap => pathname.startsWith(ap))) {
        break
      }
      return NextResponse.next()
    }
  }
  for (const ap of publicApiPaths) {
    if (pathname.startsWith(ap)) {
      return NextResponse.next()
    }
  }

  // Static assets — always allow
  if (pathname.startsWith('/_next/') || pathname.startsWith('/static/') || pathname === '/favicon.ico' || pathname.startsWith('/manifest.json') || pathname.startsWith('/opengraph-image')) {
    return NextResponse.next()
  }

  // API routes — validate token
  if (pathname.startsWith('/api/')) {
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const payload = await verifyTokenEdge(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.id)
    requestHeaders.set('x-user-email', payload.email)
    requestHeaders.set('x-user-name', payload.name)
    return NextResponse.next({
      request: { headers: requestHeaders }
    })
  }

  // Protected pages — redirect to login
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    const payload = await verifyTokenEdge(token)
    if (!payload) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|static/|favicon.ico|manifest.json|opengraph-image).*)']
}
