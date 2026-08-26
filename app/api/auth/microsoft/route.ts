import { NextRequest } from 'next/server'
import { getAccessToken, hasGraphCreds } from '@/lib/microsoft/graphClient'
import { sendPreferredSourceCampaign } from '@/lib/microsoft/sendPreferredSourceCampaign'
import { verifyToken } from '@/lib/auth'

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
 * GET /api/auth/microsoft  (admin)
 * Health-check for the Graph app-only integration: reports credential state and
 * fetches a token silently when creds exist. No browser redirect flow needed
 * for sendMail/upload (application permissions).
 */
export async function GET(req: NextRequest) {
  const admin = requireAdmin(req)
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  if (!hasGraphCreds()) {
    return Response.json({ configured: false, message: 'Set MICROSOFT_GRAPH_CLIENT_ID/_SECRET/_TENANT_ID (+_SENDER for mail)' })
  }
  try {
    const token = await getAccessToken()
    return Response.json({ configured: true, tokenOk: !!token })
  } catch (e: any) {
    return Response.json({ configured: true, tokenOk: false, error: String(e?.message || e).slice(0, 300) })
  }
}

/**
 * POST /api/auth/microsoft  (admin)
 * Body: { to: string, name?: string } -> sends the Preferred Source campaign mail.
 */
export async function POST(req: NextRequest) {
  const admin = requireAdmin(req)
  if (!admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  if (!body.to) return Response.json({ error: 'to required' }, { status: 400 })

  const result = await sendPreferredSourceCampaign(body.to, body.name)
  return Response.json({ ok: result.ok, detail: result.detail }, { status: result.ok ? 200 : 502 })
}
