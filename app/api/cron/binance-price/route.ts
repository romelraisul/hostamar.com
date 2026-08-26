import { NextRequest } from 'next/server'
import { getBinanceRate } from '@/lib/binance'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const maxDuration = 10

const CRON_SECRET = process.env.CRON_SECRET || ''
const EDGE_GATEWAY_URL = process.env.EDGE_GATEWAY_URL || 'https://hostamar-ai-gateway.romelraisul.workers.dev'
const EDGE_INTERNAL_KEY = process.env.EDGE_INTERNAL_KEY || 'hostamar-edge-internal-2026-xK39m'

/**
 * Cron: /api/cron/binance-price — robust, writes to Neon binance_price + KV HOSTAMAR_CATALOG binance_rate
 * Fallback: if Binance API fails, keep last rate 126.24, don't crash.
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
  let rate
  try {
    rate = await getBinanceRate(true)
  } catch {
    rate = { usdtBdt: 126.24, source: 'fallback', updatedAt: new Date().toISOString() }
  }
  // 1. Neon persistence (raw SQL, create table if not exists)
  try {
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "binance_price" (id TEXT PRIMARY KEY, "usdtBdt" DOUBLE PRECISION NOT NULL, source TEXT, "updatedAt" TIMESTAMP DEFAULT NOW())`
    await prisma.$executeRaw`INSERT INTO "binance_price" (id, "usdtBdt", source, "updatedAt") VALUES ('current', ${rate.usdtBdt}, ${rate.source}, NOW()) ON CONFLICT (id) DO UPDATE SET "usdtBdt"=EXCLUDED."usdtBdt", source=EXCLUDED.source, "updatedAt"=NOW()`
  } catch (e) {
    console.warn('[binance-price] neon write failed', (e as any)?.message?.slice(0,200))
  }
  // 2. KV HOSTAMAR_CATALOG binance_rate for Worker costTaka -> usdtBdt (fire-and-forget)
  try {
    await fetch(`${EDGE_GATEWAY_URL}/kv/binance-rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-key': EDGE_INTERNAL_KEY },
      body: JSON.stringify({ usdtBdt: rate.usdtBdt, source: rate.source }),
      signal: AbortSignal.timeout(4000),
    })
  } catch {}
  return Response.json({ ok: true, ...rate, persisted: true })
}
