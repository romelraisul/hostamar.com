// Shared INTERNAL_API_KEY guard for harness admin routes.
// NOTE: /api/admin/* is NOT whitelisted by middleware - it IS gated by cookie auth.
// These routes require EITHER admin JWT OR x-internal-api-key (for automation).
// Do not assume middleware bypasses auth for /api/admin/*.
import { NextRequest, NextResponse } from 'next/server'

export function guardInternal(req: NextRequest): NextResponse | null {
  const key = process.env.INTERNAL_API_KEY || ''
  const provided = req.headers.get('x-internal-api-key') || ''
  if (!key || provided !== key) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  return null
}

export async function guardWithAdminFallback(req: NextRequest): Promise<NextResponse | null> {
  // Try admin JWT first
  try {
    const { requireAdmin } = await import('@/lib/auth')
    await requireAdmin(req)
    return null
  } catch {}
  // Fall back to internal key
  return guardInternal(req)
}
