import { NextRequest, NextResponse } from 'next/server'
// BUILD-CACHE-BUSTER: this file is deliberately clean (no @/lib/metrics-store
// import) so the Edge bundle has zero Node-only deps. Do not re-add it here.

async function verifyTokenEdge(token: string): Promise<{ id: string; email: string; name: string; role?: string; orgId?: string } | null> {
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
        orgId: payload.orgId ? String(payload.orgId) : undefined,
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

  // Public API paths — no auth needed (include all NextAuth endpoints + custom auth + video public APIs)
    const publicApiPaths = [
                '/api/auth/login',
                '/api/auth/register',
                '/api/auth/me',
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
                '/api/auth/sso/start',
                '/api/auth/sso/callback',
                '/api/auth/logout',
                '/api/auth/verify-email',
                '/api/auth/resend-verification',
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
                '/api/dev/chat',
                '/api/email/setup-brevo',
                '/api/debug/env',
                '/api/support-chat',   // self-hosted Ollama L1 support, public
                '/api/auth/twitter/connect',
                '/api/metrics',
                '/api/invoices',   // server-to-server invoice generation (triggered by webhook)
                '/api/payment/verify',   // payment gateway callback — must be reachable without a session
                '/api/payment/personal',  // personal payment info — public
                '/api/internal/provision',   // self-guarded by INTERNAL_API_KEY header (server-to-server)
                '/api/cron/neon-keepalive', // Neon keep-alive cron endpoint
                '/api/test-signup', // Test endpoint for debugging
            '/api/test-redis', // Test Redis connection
            '/api/test-video-gen', // Test video generation
            '/api/test-bullmq', // Test BullMQ directly
                '/api/hosting', // Hosting API
                '/api/ide', // IDE API
                '/api/game', // Game API
                '/api/billing', // Billing API
                          '/api/auth/saml/login',
            '/api/auth/saml/acs',
            '/api/auth/saml/callback',
            '/api/auth/saml/metadata',
            '/api/auth/verify-email',
            '/api/auth/resend-verification',
            '/api/auth/oidc/authorize',
            '/api/auth/oidc/login',
            '/api/auth/oidc/callback',
            '/api/queue/status',
            '/api/queue/process', // cron worker entry — self-guarded by QUEUE_SECRET
            '/api/video/status',
            '/api/video/render/process', // self-guarded by QUEUE_SECRET
            '/api/video/file', // served via authenticated proxy (getAuthUser inside route)
]
  if (publicApiPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  // Self-guarded server-to-server / webhook paths (no cookie auth possible):
  // guarded by INTERNAL_API_KEY at the route, exactly like /api/internal/provision.
  const selfGuardedPaths = [
    '/api/harness/run',       // harness plan/execute — x-internal-api-key
    '/api/telegram/webhook',  // Telegram bot callback (cannot carry our session cookie)
    '/api/inngest',           // Inngest serve endpoint (dev server self-validates its handshake)
    '/api/webhooks/call-ended', // voice post-call webhook (server-to-server, no session cookie)
    '/api/auth/saml/metadata', // SAML SP metadata (IdP fetch, no session cookie)
    '/api/auth/saml/acs',     // SAML ACS — IdP POST, cannot carry our session cookie
    '/api/auth/saml/callback', // SAML OAuth code exchange (cross-site redirect from IdP)
    '/api/auth/oidc/authorize', // OIDC SP-initiated redirect (no session needed)
    '/api/auth/oidc/login',     // OIDC IdP-initiated entry
    '/api/auth/oidc/callback',  // OIDC code exchange (cross-site redirect from IdP)
    '/api/scim/v2',             // SCIM 2.0 — Bearer-token server-to-server (no session cookie)
  ]
  if (selfGuardedPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  // Public page paths — no auth needed
  const publicPaths = ['/', '/login', '/signup', '/pricing', '/about', '/contact', '/privacy', '/terms', '/blog', '/generate', '/ai-browser', '/ide', '/payment', '/image']

  // Public API paths — no auth needed
  const publicApiPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/me',
    '/api/health',
    '/api/auth/signup',
    '/api/auth/forgot-password',
    '/api/auth/forgot',
    '/api/auth/reset',
    '/api/auth/reset-password',
    '/api/bootstrap-admin',
    '/api/ai/image/generate',
  ]
  for (const p of publicPaths) {
    if (pathname === p || pathname.startsWith(p + '/')) {
      return NextResponse.next()
    }
  }

  // API routes — validate token (but skip public API paths)
  if (pathname.startsWith('/api/')) {
    // Check public API paths first
    const isPublicApi = publicApiPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))
    if (isPublicApi) {
      return NextResponse.next()
    }
    
    // Check both cookie and Authorization header
    let authToken = request.cookies.get('auth_token')?.value
      if (!authToken) {
        const authHeader = request.headers.get('authorization')
        if (authHeader?.startsWith('Bearer ')) {
          authToken = authHeader.slice(7).trim()
        }
      }
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
    requestHeaders.set('x-user-role', payload.role || 'customer')
    if (payload.orgId) requestHeaders.set('x-org-id', payload.orgId)
    return NextResponse.next({
      request: { headers: requestHeaders },
    })
  }

  // Protected pages — redirect to login
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
      // Check both cookie and Authorization header
      let authToken = request.cookies.get('auth_token')?.value
      if (!authToken) {
        const authHeader = request.headers.get('authorization')
        if (authHeader?.startsWith('Bearer ')) {
          authToken = authHeader.slice(7).trim()
        }
      }
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