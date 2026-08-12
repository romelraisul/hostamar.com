import { NextRequest, NextResponse } from 'next/server'

async function verifyTokenEdge(token: string): Promise<{ id: string; email: string; name: string; role?: string; orgId?: string } | null> {
  try {
    const secret = process.env.NEXTAUTH_SECRET
    if (!secret || !token) return null

    const parts = token.split('.')
    if (parts.length !== 3) return null

    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=')
    const payload = JSON.parse(atob(padded))

    if (payload.exp && Date.now() >= payload.exp * 1000) return null

    if (payload.id && payload.email) {
      return {
        id: String(payload.id),
        email: String(payload.email),
        name: String(payload.name || ''),
        role: String(payload.role || 'customer'),
        orgId: payload.orgId ? String(payload.orgId) : undefined,
      }
    }
    return null
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const authToken = request.cookies.get('auth_token')?.value
  const pathname = request.nextUrl.pathname.replace(/\/+$/, '') || '/'

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

  // Public pages — no auth needed (marketing + auth pages + product landing pages)
  const publicPages = [
    '/', '/login', '/signup', '/pricing', '/about', '/contact',
    '/privacy', '/terms', '/blog', '/forgot-password', '/reset-password',
    '/verify-email', '/signin', '/developers',
    // Public landing pages for products
    '/video', '/image', '/chat', '/browser', '/game', '/ide', '/hosting', '/dev', '/products',
  ]
  for (const p of publicPages) {
    if (pathname === p || pathname.startsWith(p + '/')) {
      return NextResponse.next()
    }
  }

  // Public API paths — auth, health, webhooks, payment (NO AI generation here)
  const publicApiPaths = [
    '/api/auth/',
    '/api/health',
    '/api/bootstrap-admin',
    '/api/auth/saml/',
    '/api/auth/oidc/',
    '/api/auth/sso/',
    '/api/auth/twitter/',
    '/api/webhooks/',
    '/api/telegram/',
    '/api/inngest',
    '/api/harness/',
    '/api/scim/',
    '/api/internal/',
    '/api/cron/',
    '/api/video/render/process',
    '/api/queue/process',
    '/api/payment/verify',
    '/api/payment/personal',
    '/api/payment/webhook',
    '/api/payment/ipn',
    '/api/payment/bkash-verify',
    '/api/video/status',
    '/api/browser/proxy',
    '/api/browser/screenshot',
    '/api/browser/summarize',
    '/api/game/',
    '/api/hosting/',
    '/api/ide/',
    '/api/billing/',
    '/api/dashboard/videos',
    '/api/storage',
    '/api/metrics',
    '/api/invoices',
    '/api/support-chat',
    '/api/debug/env',
    '/api/test-signup',
    '/api/test-redis',
    '/api/test-video-gen',
    '/api/test-bullmq',
    '/api/email/setup-brevo',
  ]
  if (pathname.startsWith('/api/')) {
    const isPublicApi = publicApiPaths.some((p) => pathname === p || pathname.startsWith(p))
    if (isPublicApi) {
      return NextResponse.next()
    }
    // Protected API — require auth
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const payload = await verifyTokenEdge(authToken)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.id)
    requestHeaders.set('x-user-email', payload.email)
    requestHeaders.set('x-user-name', payload.name)
    requestHeaders.set('x-user-role', payload.role || 'customer')
    if (payload.orgId) requestHeaders.set('x-org-id', payload.orgId)
    return NextResponse.next({
      request: { headers: requestHeaders },
    })
  }

  // Protected pages — require auth (internal/dashboard/admin tools)
  // Pages that REQUIRE login: /dashboard, /admin, /generate, /studio, /ltx-studio, /gallery, /prompts, /ossu, /subscription, /payment, /profile
  const protectedPages = [
    '/dashboard', '/admin', '/generate', '/studio',
    '/ltx-studio', '/gallery', '/prompts', '/ossu', '/subscription',
    '/payment', '/profile', '/ai-browser', '/collab', '/crm',
    '/editor', '/setup',
  ]
  for (const p of protectedPages) {
    if (pathname === p || pathname.startsWith(p + '/')) {
      if (!authToken) {
        return NextResponse.redirect(new URL('/login', request.url))
      }
      const payload = await verifyTokenEdge(authToken)
      if (!payload) {
        return NextResponse.redirect(new URL('/login', request.url))
      }
      // Admin pages require admin role
      if (pathname.startsWith('/admin') && payload.role !== 'admin' && payload.role !== 'superadmin') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-user-id', payload.id)
      requestHeaders.set('x-user-email', payload.email)
      requestHeaders.set('x-user-name', payload.name)
      requestHeaders.set('x-user-role', payload.role || 'customer')
      if (payload.orgId) requestHeaders.set('x-org-id', payload.orgId)
      return NextResponse.next({
        request: { headers: requestHeaders },
      })
    }
  }

  // Default: allow (for any unmatched paths)
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|static/|favicon.ico|manifest.json|opengraph-image).*)'],
}
