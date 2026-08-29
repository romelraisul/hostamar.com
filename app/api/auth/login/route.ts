export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.API_BACKEND_URL || 'https://api.hostamar.com'

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validatePassword(password: string): string | null {
  if (!password || password.length < 6) return 'Password must be at least 6 characters'
  if (password.length > 128) return 'Password too long'
  return null
}

export async function POST(request: NextRequest) {
  // RATE LIMIT (edge layer, ALWAYS enforced): 10 logins / 15 min per IP
  const { slidingWindow, getClientIpEdge } = await import('@/lib/rate-limit-edge')
  const rlLogin = slidingWindow(`login:${getClientIpEdge(request)}`, 10, 15 * 60 * 1000)
  if (!rlLogin.ok) {
    return NextResponse.json(
      { error: 'Too many login attempts. Try again in 15 minutes. (অনেক চেষ্টা — ১৫ মিনিট পরে)' },
      { status: 429 },
    )
  }

  const hasLocalDb = process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgresql://')

  if (hasLocalDb) {
    try {
      const { comparePassword, signToken } = await import('@/lib/auth-utils')
      const { prisma } = await import('@/lib/prisma')

      const body = await request.json()
      const { email, password } = body

      const pwErr = validatePassword(password)
      if (!email || !validateEmail(email)) {
        return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
      }
      if (pwErr) {
        return NextResponse.json({ error: pwErr }, { status: 400 })
      }

      const customer = await prisma.customer.findUnique({ where: { email: email.toLowerCase() } })
      if (!customer) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
      }

      const valid = await comparePassword(password, customer.password!)
      if (!valid) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
      }

      const token = signToken({ id: customer.id, email: customer.email, name: customer.name, role: customer.role })

      // MFA gate (optional TOTP): if enabled, require a valid 6-digit code
      // before issuing the session cookie.
      let mfaRow: any = null
      try {
        mfaRow = await prisma.$queryRawUnsafe(
          `SELECT "mfaSecret", "mfaEnabled" FROM "Customer" WHERE id = $1 LIMIT 1`, customer.id,
        )
      } catch { /* columns not present yet → no MFA configured */ }
      const mfa = Array.isArray(mfaRow) ? mfaRow[0] : null
      if (mfa?.mfaEnabled) {
        const { totpVerify } = await import('@/lib/totp')
        const supplied = String((body as any)?.mfaToken || (request.headers.get('x-mfa-token') || ''))
        if (!totpVerify(mfa.mfaSecret, supplied)) {
          return NextResponse.json(
            { mfaRequired: true, error: 'MFA কোড লাগবে (6-digit, Google Authenticator)' },
            { status: 401 },
          )
        }
      }

      // SECURITY: server-set HttpOnly cookie — XSS cannot read the token.
      // Client keeps receiving `token` in JSON for Bearer/CLI use, but the
      // browser session rides on this cookie exclusively.
      const res = NextResponse.json({
        token,
        user: { id: customer.id, email: customer.email, name: customer.name, role: customer.role }
      })
      res.cookies.set('auth_token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      })
      return res
    } catch (e: any) {
      console.error('Local login error, falling back to proxy:', e)
      // Fall through to proxy below
    }
  }

  // Proxy to local backend via Cloudflare tunnel
  try {
    const body = await request.json()
    const resp = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await resp.json()
    return NextResponse.json(data, { status: resp.status })
  } catch (e: any) {
    console.error('Proxy login error:', e)
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 })
  }
}
