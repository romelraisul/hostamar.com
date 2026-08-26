import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { deductCredits } from '@/lib/credits'

export const dynamic = 'force-dynamic'
export const maxDuration = 10
export const runtime = 'nodejs'

/**
 * POST /api/credits/deduct
 * Standalone endpoint — thin wrapper over the shared lib (for external callers).
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any = {}
  try { body = await req.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const amount = Number(body.amount)
  const type = String(body.type || 'general')
  const description = String(body.description || '')

  const result = await deductCredits(user.id, amount, type, description)
  if (!result.ok) {
    return Response.json({ error: result.error, needed: result.needed, balance: result.balance }, { status: 402 })
  }
  return Response.json({ ok: true, creditsRemaining: result.creditsRemaining, charged: result.charged, source: result.source })
}
