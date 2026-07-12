// Shared INTERNAL_API_KEY guard for harness admin routes.
// Routes live under /api/admin/* which middleware already whitelists (bypasses
// the cookie-auth), so each route self-guards with the internal key header.
import { NextRequest, NextResponse } from 'next/server'

export function guardInternal(req: NextRequest): NextResponse | null {
  const key = process.env.INTERNAL_API_KEY || ''
  const provided = req.headers.get('x-internal-api-key') || ''
  if (!key || provided !== key) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  return null
}
