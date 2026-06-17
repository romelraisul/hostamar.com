import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

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
      // Note: recordLoginAttempt should be called in the login API route itself
      return NextResponse.next()
    }

    // Protected admin routes
    if (url.pathname.startsWith('/admin')) {
      // Must be authenticated
      if (!token) {
        const loginUrl = new URL('/login', url)
        loginUrl.searchParams.set('callbackUrl', url.pathname)
        return NextResponse.redirect(loginUrl)
      }

      // Optional: IP allowlist
      if (!ipInAllowlist(ip)) {
        return NextResponse.json(
          { error: 'Access denied from this IP address' },
          { status: 403 }
        )
      }

      // Admin role check (using customer ID prefix or email)
      const isAdmin = token.email === 'admin@hostamar.com' || 
                      (token.id as string)?.startsWith('admin-')

      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        )
      }

      // Sensitive admin routes require re-authentication
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
      
      // Specific rate limits per endpoint
      const limits: Record<string, number> = {
        '/api/admin/automation': 10,
        '/api/admin/chat': 20,
        '/api/admin/customers': 30,
        '/api/admin/videos': 30,
        '/api/admin/stats': 60,
      }

      const limit = Object.entries(limits).find(([path]) => pathname.startsWith(path))?.[1] || 30
      // Note: detailed rate limiting is handled in each API route via lib/rate-limit.ts
    }

    // Security headers
    const response = NextResponse.next()
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    
    if (process.env.NODE_ENV === 'production') {
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    }

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
