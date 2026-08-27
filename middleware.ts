import { NextRequest, NextResponse } from 'next/server'
// BUILD-CACHE-BUSTER: this file is deliberately clean (no @/lib/metrics-store
// import) so the Edge bundle has zero Node-only deps. Do not re-add it here.



function b64urlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64.padEnd(b64.length + (4 - (b64.length % 4)) % 4, '=')
  const bin = atob(padded)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function hmacVerify(message: string, signatureB64Url: string, secret: string): Promise<boolean> {
  try {
    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey('raw', enc.encode(secret) as BufferSource, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
    const sigBytes = b64urlToBytes(signatureB64Url) as BufferSource
    const msgBytes = enc.encode(message) as BufferSource
    return await crypto.subtle.verify('HMAC', key, sigBytes, msgBytes)
  } catch { return false }
}

async function verifyTokenEdge(token: string): Promise<{ id: string; email: string; name: string; role?: string; orgId?: string } | null> {
  try {
    const secrets: string[] = []
    if (process.env.JWT_SECRET) secrets.push(process.env.JWT_SECRET)
    if (process.env.NEXTAUTH_SECRET) secrets.push(process.env.NEXTAUTH_SECRET)
    if (process.env.AUTH_SECRET) secrets.push(process.env.AUTH_SECRET)
    if (secrets.length === 0) return null
    if (!token) return null

    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [hB64, pB64, sB64] = parts

    // try each secret — JWT may have been signed with JWT_SECRET or NEXTAUTH_SECRET
    let verified = false
    for (const sec of secrets) {
      if (await hmacVerify(`${hB64}.${pB64}`, sB64, sec)) { verified = true; break }
    }
    if (!verified) return null

    const payloadBytes = b64urlToBytes(pB64)
    const json = new TextDecoder().decode(payloadBytes)
    const payload = JSON.parse(json)

    if (payload.exp && Date.now() >= payload.exp * 1000) return null
    if (payload.nbf && Date.now() < payload.nbf * 1000) return null
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
    '/api/health',
    '/api/auth/signup',
    '/api/auth/forgot-password',
    '/api/auth/forgot',
    '/api/auth/reset',
    '/api/auth/reset-password',
    '/api/bootstrap-admin',
    '/api/storage',
    '/api/auth/providers',
    '/api/auth/callback',
    '/api/auth/signin',
    '/api/auth/signout',
    '/api/auth/csrf',
    '/api/auth/session',
    '/api/support-chat',   // public Ollama L1 support
    '/api/payment/verify',   // payment gateway callback — must be reachable without a session
    '/api/binance-price',
    '/api/market-adjust',
    '/api/services/catalog',
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
  const publicPaths = ['/', '/login', '/signup', '/pricing', '/about', '/contact', '/privacy', '/terms', '/blog', '/generate', '/ai-browser', '/ide']
  for (const p of publicPaths) {
    if (pathname === p || pathname.startsWith(p + '/')) {
      return NextResponse.next()
    }
  }

  // API routes — validate token (cookie or Authorization Bearer)
  if (pathname.startsWith('/api/')) {
    const authHeader = request.headers.get('authorization') || ''
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
    const tokenToVerify = authToken || bearerToken
    if (!tokenToVerify) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    const payload = await verifyTokenEdge(tokenToVerify)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.id)
    requestHeaders.set('x-user-email', payload.email)
    requestHeaders.set('x-user-name', payload.name)
    if (payload.orgId) requestHeaders.set('x-org-id', payload.orgId)
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

  // Force Bangla for dashboard — 100% Bangla requirement
  if (pathname.startsWith('/dashboard')) {
    const res = NextResponse.next()
    res.cookies.set('locale', 'bn', { path: '/', maxAge: 31536000 })
    return res
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|static/|favicon.ico|manifest.json|opengraph-image).*)']
}