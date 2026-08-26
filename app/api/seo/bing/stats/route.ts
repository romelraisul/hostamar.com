import { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getBingStats } from '@/lib/bing/webmaster'

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

/** GET /api/seo/bing/stats  (admin) — crawl stats + index snapshot. */
export async function GET(req: NextRequest) {
  const admin = requireAdmin(req)
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const stats = await getBingStats()
  return Response.json(stats, { status: stats.ok ? 200 : 501 })
}
