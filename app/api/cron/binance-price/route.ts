import { NextRequest } from 'next/server'
import { getBinanceRate } from '@/lib/binance'

export const dynamic = 'force-dynamic'
export const maxDuration = 10

const CRON_SECRET = process.env.CRON_SECRET || ''

/**
 * Hourly cron: refresh the Binance P2P rate (warms the in-memory cache on the
 * warm lambda; public GET /api/binance-price serves clients). Phase 3 can
 * persist to a BinanceRate table for history.
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
  const rate = await getBinanceRate(true)
  return Response.json({ ok: true, ...rate })
}
