export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { executeWithFailover } from '@/lib/db-failover'

const BACKEND_URL = process.env.API_BACKEND_URL || 'https://api.hostamar.com'

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validatePassword(password: string): string | null {
  if (!password || password.length < 6) return 'Password must be at least 6 characters'
  if (password.length > 128) return 'Password too long'
  return null
}

async function findUserByEmail(email: string) {
  return executeWithFailover(async (client, dbType) => {
    const q = dbType === 'turso'
      ? { sql: `SELECT * FROM "Customer" WHERE email = ? LIMIT 1`, args: [email] }
      : { text: `SELECT * FROM "Customer" WHERE email = $1 LIMIT 1`, values: [email] }
    const rows = dbType === 'turso'
      ? (await client.execute(q as any)).rows
      : (await client.query(q.text, q.values)).rows
    return rows[0] || null
  })
}

async function getMfaStatus(userId: string) {
  return executeWithFailover(async (client, dbType) => {
    const q = dbType === 'turso'
      ? { sql: `SELECT "mfaSecret", "mfaEnabled" FROM "Customer" WHERE id = ? LIMIT 1`, args: [userId] }
      : { text: `SELECT "mfaSecret", "mfaEnabled" FROM "Customer" WHERE id = $1 LIMIT 1`, values: [userId] }
    const rows = dbType === 'turso'
      ? (await client.execute(q as any)).rows
      : (await client.query(q.text, q.values)).rows
    return rows[0] || null
  })
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

  // Use db-failover for edge-compatible login (works on Cloudflare Workers/Pages)
  // This replaces the Prisma-only path which fails on edge due to @libsql/client/web WebSocket issues
  try {
    const { comparePassword, signToken } = await import('@/lib/auth-utils')

    const body = await request.json()
    const { email, password } = body

    const normalizedEmail = email?.trim?.().toLowerCase?.().replace(/\.com\.com+$/, '.com').replace(/\.com\.com\.com+$/, '.com').replace(/\s+/g, '') || ''

    const pwErr = validatePassword(password)
    if (!normalizedEmail || !validateEmail(normalizedEmail)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }
    if (pwErr) {
      return NextResponse.json({ error: pwErr }, { status: 400 })
    }

    // Use db-failover to find user (works on edge: Turso HTTPS -> Neon -> Supabase)
    const customerResult = await findUserByEmail(normalizedEmail)
    const customer = customerResult?.result
    if (!customer) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const valid = await comparePassword(password, (customer as any).password!)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const token = signToken({ id: customer.id, email: customer.email, name: customer.name, role: customer.role })

    // MFA gate (optional TOTP)
    const mfaResult = await getMfaStatus((customer as any).id)
    const mfa = mfaResult?.result
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

    // SECURITY: server-set HttpOnly cookie
    const res = NextResponse.json({
      token,
      user: { id: customer.id, email: customer.email, name: customer.name, role: customer.role }
    })
    res.headers.append('Set-Cookie',
      `auth_token=${token}; Path=/; Max-Age=${60*60*24*30}; Secure; HttpOnly; SameSite=Lax`)
    res.headers.append('Set-Cookie', 'auth_token=; Path=/; Max-Age=0; Domain=.hostamar.com; Secure; HttpOnly; SameSite=Lax')
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    return res
  } catch (e: any) {
    console.error('Edge login error:', e)
    // Fall through to proxy as last resort
  }

  // Proxy to local backend via Cloudflare tunnel (fallback)
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
