export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/auth/forgot-password
 *
 * Under the Vercel-frontend / Railway-backend split, the database lives only on
 * the dedicated backend (api.hostamar.com). A Next.js filesystem route always
 * wins over a vercel.json rewrite, so we can't proxy at the edge — instead we
 * forward the request to the backend and return its response.
 *
 * Falls back to a safe no-op response if the backend URL isn't configured
 * (e.g. local dev with a local DB).
 */
const BACKEND = process.env.NEXT_PUBLIC_API_URL

export async function POST(req: NextRequest) {
  if (BACKEND) {
    try {
      const res = await fetch(`${BACKEND}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: await req.text(),
      })
      const data = await res.json().catch(() => ({}))
      return NextResponse.json(data, { status: res.status })
    } catch (err) {
      console.error('Forgot-password proxy error:', (err as Error)?.message || err)
      // Same safe response shape the backend uses when email is unknown.
      return NextResponse.json({
        success: true,
        message: 'If the email exists, a reset link has been sent.',
      })
    }
  }

  // Local / non-split fallback (kept minimal; full logic runs on the backend).
  return NextResponse.json({
    success: true,
    message: 'If the email exists, a reset link has been sent.',
  })
}