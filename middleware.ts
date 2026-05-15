import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value
  const { pathname } = request.nextUrl

  // Public paths — no auth needed
  const publicPaths = ['/', '/login', '/signup', '/pricing', '/about', '/contact', '/privacy', '/terms', '/blog']
  const publicApiPaths = ['/api/auth/login', '/api/auth/register', '/api/health', '/api/auth/signup']
  
  for (const p of publicPaths) {
    if (pathname === p || pathname.startsWith(p + '/')) {
      // Check if it's an API sub-path we want to protect
      if (pathname.startsWith('/api/') && !publicApiPaths.some(ap => pathname.startsWith(ap))) {
        break // don't skip, check auth below
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
    const payload = verifyToken(token)
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
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|opengraph-image).*)']
}
