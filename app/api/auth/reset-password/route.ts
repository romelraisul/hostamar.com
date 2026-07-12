export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/auth/reset-password  { token, password }
 * GET  /api/auth/reset-password?token=...
 *
 * Under the Vercel-frontend / Railway-backend split the database lives only on
 * the dedicated backend (api.hostamar.com). A Next.js filesystem route always
 * wins over a vercel.json rewrite, so we forward to the backend and return its
 * response. The backend holds the VerificationToken + Customer records.
 */
const BACKEND = process.env.NEXT_PUBLIC_API_URL

export async function POST(req: NextRequest) {
  if (BACKEND) {
    try {
      const res = await fetch(`${BACKEND}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: await req.text(),
      })
      const data = await res.json().catch(() => ({}))
      return NextResponse.json(data, { status: res.status })
    } catch (err) {
      console.error('Reset-password proxy error:', (err as Error)?.message || err)
      return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
    }
  }
  return NextResponse.json({ error: 'Reset unavailable' }, { status: 503 })
}

export async function GET(req: NextRequest) {
  if (BACKEND) {
    try {
      const url = new URL(req.url)
      const token = url.searchParams.get('token') || ''
      const res = await fetch(
        `${BACKEND}/api/auth/reset-password?token=${encodeURIComponent(token)}`,
        { method: 'GET' }
      )
      const data = await res.json().catch(() => ({}))
      return NextResponse.json(data, { status: res.status })
    } catch (err) {
      console.error('Reset-password GET proxy error:', (err as Error)?.message || err)
      return NextResponse.json({ valid: false, error: 'Server error' }, { status: 500 })
    }
  }
  return NextResponse.json({ valid: false, error: 'Reset unavailable' }, { status: 503 })
}