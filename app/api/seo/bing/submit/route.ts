import { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { hasBingKey, submitUrlsToBing } from '@/lib/bing/webmaster'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 20

function requireAdmin(req: NextRequest): { id: string; role?: string } | null {
  const token = req.cookies.get('auth_token')?.value
  if (!token) return null
  const payload = verifyToken(token)
  if (!payload || (payload.role !== 'admin' && payload.role !== 'superadmin')) return null
  return payload
}

/**
 * POST /api/seo/bing/submit  (admin)
 * Body: { urls: string[] } -> Bing SubmitUrlBatch (max 100/call).
 */
export async function POST(req: NextRequest) {
  const admin = requireAdmin(req)
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  if (!Array.isArray(body.urls) || !body.urls.length) {
    return Response.json({ error: 'urls[] required' }, { status: 400 })
  }
  if (!hasBingKey()) return Response.json({ ok: false, detail: 'BING_WEBMASTER_API_KEY missing' }, { status: 501 })

  const result = await submitUrlsToBing(body.urls)
  return Response.json({ ok: result.ok, status: result.status, detail: result.detail })
}
