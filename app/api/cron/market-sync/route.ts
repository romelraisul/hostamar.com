import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { HOSTING_PLANS, CHAT_RATES } from '@/lib/pricing'
import { getBinanceRate } from '@/lib/binance'

export const dynamic = 'force-dynamic'
export const maxDuration = 10
export const runtime = 'nodejs'

/**
 * GET /api/cron/market-sync
 * Daily (Vercel Hobby cap): computes market drift, logs to MarketTrend,
 * applies auto-adjust if AUTO_ADJUST env = true, else queues for admin approval.
 */
export async function GET(req: NextRequest) {
  const isVercelCron = req.headers.get('x-vercel-cron') === '1'
  const CRON_SECRET = process.env.CRON_SECRET || ''
  if (!isVercelCron && CRON_SECRET) {
    const auth = req.headers.get('authorization') || ''
    const q = req.nextUrl.searchParams.get('secret') || ''
    if (auth !== `Bearer ${CRON_SECRET}` && q !== CRON_SECRET) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const AUTO_ADJUST = process.env.AUTO_ADJUST === 'true'
  const binance = await getBinanceRate()
  const usdtBdt = binance.usdtBdt
  const trends: any[] = []

  // --- Hosting market anchors (USD) → convert to Taka @ Binance rate ---
  const anchors = [
    { vendor: 'Hetzner CX22', usd: 4.8 },
    { vendor: 'DigitalOcean Basic', usd: 12 },
    { vendor: 'Vultr Cloud', usd: 10 },
  ]
  const avgUsd = anchors.reduce((s, a) => s + a.usd, 0) / anchors.length
  const costBasis = avgUsd * usdtBdt // raw market cost in Taka
  const targetStarter = Math.round((costBasis * 1.3) / 50) * 50 // 30% margin, round to 50

  // Compare against current
  const current = HOSTING_PLANS.starter.price
  const driftPct = ((targetStarter - current) / current) * 100

  if (Math.abs(driftPct) >= 10) {
    const trend = {
      service: 'hosting.starter',
      oldPrice: current,
      newPrice: targetStarter,
      driftPct: Math.round(driftPct * 100) / 100,
      source: 'hetzner+do+vultr avg',
      status: AUTO_ADJUST ? 'applied' : 'pending_approval',
      metadata: JSON.stringify({ anchors, avgUsd, usdtBdt, margin: 1.3 }),
    }
    await prisma.$executeRaw`
      INSERT INTO "MarketTrend" (id, service, "oldPrice", "newPrice", "driftPct", source, status, metadata)
      VALUES (gen_random_uuid()::text, ${trend.service}, ${trend.oldPrice}, ${trend.newPrice}, ${trend.driftPct}, ${trend.source}, ${trend.status}, ${trend.metadata}::jsonb)
    `
    trends.push(trend)
  }

  return Response.json({
    ok: true,
    at: new Date().toISOString(),
    binance: { usdtBdt, source: binance.source },
    trends,
    autoAdjust: AUTO_ADJUST,
    note: AUTO_ADJUST ? 'trends applied directly' : 'trends queued for admin approval',
  })
}
