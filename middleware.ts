import { withAuth } from 'next-auth/middleware'
import { NextResponse, type NextRequest } from 'next/server'
import crypto from 'crypto'

// Admin IP allowlist (empty = all IPs allowed with valid auth)
const ADMIN_IP_ALLOWLIST: string[] = [
  '127.0.0.1',
  '::1',
  // Add your office/VPN IPs here:
  // '192.168.1.0/24',
]

// Rate limiter state (per IP)
const loginAttempts = new Map<string, { count: number; blockedUntil: number }>()
const MAX_LOGIN_ATTEMPTS = 5
const BLOCK_DURATION_MS = 15 * 60 * 1000 // 15 min

function ipInAllowlist(ip: string): boolean {
  if (ADMIN_IP_ALLOWLIST.length === 0) return true
  return ADMIN_IP_ALLOWLIST.some(allowed => {
    if (allowed.includes('/')) {
      const [base, mask] = allowed.split('/')
      const range = parseInt(mask)
      const ipNum = ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct), 0)
      const maskNum = ~(2 ** (32 - range) - 1)
      const baseNum = base.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct), 0)
      return (ipNum & maskNum) === (baseNum & maskNum)
    }
    return ip === allowed
  })
}

function checkLoginRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = loginAttempts.get(ip)
  
  if (entry && now < entry.blockedUntil) {
    return false
  }
  
  if (entry && now > entry.blockedUntil) {
    loginAttempts.delete(ip)
  }
  
  return true
}

function recordLoginAttempt(ip: string, success: boolean) {
  if (success) {
    loginAttempts.delete(ip)
    return
  }

  const entry = loginAttempts.get(ip) || { count: 0, blockedUntil: 0 }
  entry.count++
  
  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    entry.blockedUntil = Date.now() + BLOCK_DURATION_MS
    entry.count = 0
  }
  
  loginAttempts.set(ip, entry)
}

// Canary/feature flag evaluation
const CANARY_PERCENT = Number(process.env.CANARY_PERCENT || '0')
const FEATURE_FLAG = process.env.FEATURE_FLAG || 'admin_new_model_routing'

function hashToPercent(key: string): number {
  const h = crypto.createHash('sha256').update(key).digest()
  return (h.readUInt32BE(0) / 0xffffffff) * 100
}

function checkCanary(req: NextRequest, response: NextResponse): void {
  response.headers.set('x-feature-flag', FEATURE_FLAG)

  if (CANARY_PERCENT <= 0) {
    response.headers.set('x-canary', '0')
    return
  }

  const force = req.cookies.get('x-canary')?.value === '1' ||
                req.headers.get('x-canary') === '1'
  if (force) {
    response.headers.set('x-canary', '1')
    response.cookies.set('x-canary', '1', {
      httpOnly: false, sameSite: 'lax', maxAge: 604800
    })
    return
  }

  const userId = req.headers.get('x-user-id') ||
                req.cookies.get('user_id')?.value
  const sessionId = req.cookies.get('next-auth.session-token')?.value ||
                    req.cookies.get('__Secure-next-auth.session-token')?.value
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ||
             req.headers.get('x-real-ip') || ''

  const key = userId || sessionId || ip || Math.random().toString()
  const pct = hashToPercent(key)

  if (pct < CANARY_PERCENT) {
    response.headers.set('x-canary', '1')
    response.cookies.set('x-canary', '1', {
      httpOnly: false, sameSite: 'lax', maxAge: 604800
    })
  } else {
    response.headers.set('x-canary', '0')
  }
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const url = req.nextUrl
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               req.headers.get('x-real-ip') || 
               '127.0.0.1'

    // Login route rate limiting
    if (url.pathname === '/api/auth/login' || url.pathname === '/api/auth/credentials') {
      if (!checkLoginRateLimit(ip)) {
        return NextResponse.json(
          { error: 'Too many login attempts. Try again in 15 minutes.' },
          { status: 429 }
        )
      }
      return NextResponse.next()
    }

    // Protected admin routes
    if (url.pathname.startsWith('/admin')) {
      if (!token) {
        const loginUrl = new URL('/login', url)
        loginUrl.searchParams.set('callbackUrl', url.pathname)
        return NextResponse.redirect(loginUrl)
      }

      if (!ipInAllowlist(ip)) {
        return NextResponse.json(
          { error: 'Access denied from this IP address' },
          { status: 403 }
        )
      }

      const isAdmin = token.email === 'admin@hostamar.com' || 
                      (token.id as string)?.startsWith('admin-')

      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        )
      }

      const sensitivePaths = ['/admin/subscriptions', '/admin/settings', '/api/admin/manual-payments']
      const needsReAuth = sensitivePaths.some(p => url.pathname.startsWith(p))
      
      if (needsReAuth) {
        const tokenAge = req.headers.get('x-auth-age')
        if (tokenAge && parseInt(tokenAge) > 3600) {
          return NextResponse.json(
            { error: 'Session expired. Please re-authenticate.' },
            { status: 401 }
          )
        }
      }
    }

    // Rate limiting on admin API routes
    if (url.pathname.startsWith('/api/admin/')) {
      const { pathname } = url
      const key = `${ip}:${pathname}`
      
      const limits: Record<string, number> = {
        '/api/admin/automation': 10,
        '/api/admin/chat': 20,
        '/api/admin/customers': 30,
        '/api/admin/videos': 30,
        '/api/admin/stats': 60,
      }

      const limit = Object.entries(limits).find(([path]) => pathname.startsWith(path))?.[1] || 30
    }

    // Security headers + canary evaluation
    const response = NextResponse.next()
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    
    if (process.env.NODE_ENV === 'production') {
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    }

    checkCanary(req, response)

    return response
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow public routes
        const publicPaths = ['/login', '/api/auth/', '/api/public']
        if (publicPaths.some(p => req.nextUrl.pathname.startsWith(p))) {
          return true
        }

        // Admin routes require token
        if (req.nextUrl.pathname.startsWith('/admin')) {
          return !!token
        }

        return true
      },
    },
  }
)

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/api/auth/login',
    '/login',
  ]
}
