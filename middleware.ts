import { NextRequest, NextResponse } from 'next/server'

const PRODUCT_SUBDOMAIN_PATHS: Record<string, string> = {
  'studio.hostamar.com': '/studio',
  'video.hostamar.com': '/video',
  'voice.hostamar.com': '/chat',
  'chat.hostamar.com': '/chat',
  'browser.hostamar.com': '/browser',
  'ide.hostamar.com': '/ide',
  'game.hostamar.com': '/game',
  'hosting.hostamar.com': '/hosting',
}

async function verifyTokenEdge(token: string): Promise<{ id: string; email: string; name: string; role?: string; orgId?: string } | null> {
  try {
    const secret = process.env.JWT_SECRET
    if (!secret || !token) return null

    const parts = token.split('.')
    if (parts.length !== 3) return null

    const header = JSON.parse(decodeBase64Url(parts[0]))
    if (header.alg !== 'HS256') return null

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )
    const signature = base64UrlToBytes(parts[2])
    const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    const verified = await crypto.subtle.verify(
      'HMAC',
      key,
      signature.buffer as ArrayBuffer,
      data
    )
    if (!verified) return null

    const payload = JSON.parse(decodeBase64Url(parts[1]))

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

function decodeBase64Url(value: string): string {
  return new TextDecoder().decode(base64UrlToBytes(value))
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export async function middleware(request: NextRequest) {
  const authToken = request.cookies.get('auth_token')?.value
  const requestedPathname = request.nextUrl.pathname.replace(/\/+$/, '') || '/'
  const hostname = (request.headers.get('host') || '').split(':')[0].toLowerCase()
  const subdomainPath = PRODUCT_SUBDOMAIN_PATHS[hostname]
  const pathname = requestedPathname === '/' && subdomainPath ? subdomainPath : requestedPathname

  const continueRequest = (requestHeaders?: Headers) => {
    const init = requestHeaders ? { request: { headers: requestHeaders } } : undefined
    if (pathname !== requestedPathname) {
      const destination = request.nextUrl.clone()
      destination.pathname = pathname
      return NextResponse.rewrite(destination, init)
    }
    return NextResponse.next(init)
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

  // Public pages — no auth needed (marketing + auth pages + MINIMAL product landing pages)
  // NOTE: /generate + /hosting marketing views stay public — real product dashboards remain protected
  // so pricing/banners/SEO (P0) never hit a 307 login wall. Remove /chat /browser /game /dev /hosting
  // from protectedPages below and keep them public ONLY for landing view — API still 401-guarded.
  const publicPages = [
    '/', '/login', '/signup', '/pricing', '/about', '/contact',
    '/privacy', '/terms', '/blog', '/forgot-password', '/reset-password',
    '/verify-email', '/signin', '/developers',
    '/dev', '/products',
    '/generate', '/ai-browser', '/ide',
    // 6-product production-grade: marketing landing views public (no login wall for 200)
    // Dashboard/IDE editing behind auth still enforced inside page via 'withAuth' client guard
    '/generate', '/hosting', '/chat', '/browser', '/game', '/dev',
    '/tv',
  ]
  for (const p of publicPages) {
    if (pathname === p || pathname.startsWith(p + '/')) {
      return continueRequest()
    }
  }

  // Public API paths — auth, health, webhooks, payment (NO AI generation here)
  const publicApiPaths = [
    '/api/auth/',
    '/api/health',
    '/api/products',
    '/api/pricing',
    '/api/seo/track',
    '/api/payments/sms-webhook',
    '/api/tv/status',
    '/api/tv/heartbeat',
    '/api/tv/r2',
    '/api/tv/now-playing',
    '/api/tv/playlist',
    '/api/tv/hls-url',
    '/v1/',
    '/api/v1/',
    '/api/tv/generate-loop',
    '/api/tv/agent/',
    '/api/tv/viral/',
    '/api/tv/view',
    '/api/tv/iptv.m3u',
    '/api/tv/epg.xml',
    '/api/iptv',
    '/api/hosting/status',
    '/api/generate/history',
    '/api/chat/ai-assist',
    '/api/test-or',
    '/api/test-chat',
    '/api/browser/summarize',
    '/api/game/credits',
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
    '/api/binance-price',
    '/api/market-adjust',
    '/api/video/render/process',
    '/api/queue/process',
    '/api/payment/verify',
    '/api/payment/personal',
    '/api/payment/webhook',
    '/api/payment/ipn',
    '/api/payment/bkash-verify',
    '/api/video/status',
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
    '/api/browser/',
    '/api/ai-gateway/',
    '/api/videos/generate',
    '/api/showcase',
    '/api/comfy',
    '/api/ai/videos/generate',
    '/api/keys',
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
  // Pages that REQUIRE login: /dashboard, /admin, /studio, /ltx-studio, /gallery, /prompts, /ossu, /subscription, /payment, /profile
  // NOTE: /voice /chat /browser /game /hosting marketing landings are PUBLIC (see publicPages) — only dashboard-prefixed variants need auth
  const protectedPages = [
    '/dashboard', '/admin', '/studio', '/video', '/image',
    '/voice',
    '/ltx-studio', '/gallery', '/prompts', '/ossu', '/subscription',
    '/payment', '/profile', '/collab', '/crm',
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
      return continueRequest(requestHeaders)
    }
  }

  // Default: allow (for any unmatched paths)
  return continueRequest()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|static/|favicon.ico|manifest.json|opengraph-image).*)'],
}
