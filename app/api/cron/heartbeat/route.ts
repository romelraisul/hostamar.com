import { NextRequest } from 'next/server'
import { ensureMemorySchema } from '@/lib/kai9000/memory-lifecycle'
import { heartbeatTick } from '@/lib/kai9000/heartbeat'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const CRON_SECRET = process.env.CRON_SECRET || ''

/**
 * GET /api/cron/heartbeat — V8 Phase B, daily 9AM Dhaka (03:30 UTC).
 * DAILY, not 30-min: sub-daily crons fail deploy on this plan (V25-27 rule).
 * Guard: x-vercel-cron (Vercel scheduler) or CRON_SECRET bearer/query.
 * Runs memory-schema ensure + stuck-order heartbeat (24h dedupe, budget-gated).
 */
export async function GET(req: NextRequest) {
  const isVercelCron = req.headers.get('x-vercel-cron') === '1'
  if (!isVercelCron && CRON_SECRET) {
    const auth = req.headers.get('authorization') || ''
    const q = req.nextUrl.searchParams.get('secret') || ''
    if (auth !== `Bearer ${CRON_SECRET}` && q !== CRON_SECRET) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }
  await ensureMemorySchema()
  const hb = await heartbeatTick()
  return Response.json({ ok: true, at: new Date().toISOString(), ...hb })
}
