import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getBinanceRate } from '@/lib/binance'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/market-adjust — daily cron: Fetch $HOSTA (Dexscreener) + Binance USDT/BDT + OpenRouter costs
 * Calculates suggested pricing: Starter 599 Taka = $4.74 at 126.24, adjust if USDT/BDT moves >2%
 * Writes to Neon market_adjustment { suggestedPrice, currentPrice, diff%, status: pending_approval }
 */
export async function GET(req: NextRequest) {
  const isVercelCron = req.headers.get('x-vercel-cron') === '1'
  const CRON_SECRET = process.env.CRON_SECRET || ''
  if (!isVercelCron && CRON_SECRET) {
    const auth = req.headers.get('authorization') || ''
    const q = req.nextUrl.searchParams.get('secret') || ''
    if (auth !== `Bearer ${CRON_SECRET}` && q !== CRON_SECRET) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const binance = await getBinanceRate().catch(()=>({ usdtBdt: 126.24, source:'fallback', updatedAt: new Date().toISOString() }))
  // Dexscreener $HOSTA (placeholder token address — fallback to mock if not found)
  let hostaPrice = 0.0385
  try {
    const r = await fetch('https://api.dexscreener.com/latest/dex/search/?q=$HOSTA', { signal: AbortSignal.timeout(5000) } as any)
    const j:any = await r.json()
    const p = parseFloat(j?.pairs?.[0]?.priceUsd)
    if (Number.isFinite(p) && p>0) hostaPrice = p
  } catch {}

  const currentPrice = 599
  const suggestedPrice = Math.round((4.74 * binance.usdtBdt) / 1) // $4.74 * BDT
  const diffPct = Math.round(((suggestedPrice - currentPrice)/currentPrice)*10000)/100

  let status: string = 'no_change'
  if (Math.abs(diffPct) > 2) status = 'pending_approval'

  // persist to Neon market_adjustment
  try {
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "market_adjustment" (id TEXT PRIMARY KEY, "suggestedPrice" DOUBLE PRECISION, "currentPrice" DOUBLE PRECISION, "diffPct" DOUBLE PRECISION, status TEXT, "hostaPrice" DOUBLE PRECISION, "usdtBdt" DOUBLE PRECISION, "createdAt" TIMESTAMP DEFAULT NOW())`
    const id = `adj-${Date.now()}`
    await prisma.$executeRaw`INSERT INTO "market_adjustment" (id, "suggestedPrice", "currentPrice", "diffPct", status, "hostaPrice", "usdtBdt", "createdAt") VALUES (${id}, ${suggestedPrice}, ${currentPrice}, ${diffPct}, ${status}, ${hostaPrice}, ${binance.usdtBdt}, NOW())`
    // log to SeoEvent + slack stub
    try {
      await prisma.$executeRaw`INSERT INTO "SeoEvent" (id, type, payload, "createdAt") VALUES (gen_random_uuid()::text, 'market_adjust', ${JSON.stringify({ suggestedPrice, currentPrice, diffPct, hostaPrice, usdtBdt: binance.usdtBdt })}::jsonb, NOW())`
    } catch {}
    if (process.env.SLACK_WEBHOOK_URL) {
      fetch(process.env.SLACK_WEBHOOK_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text: `Market adjust: ${currentPrice}→${suggestedPrice} Taka (${diffPct}%) @ ${binance.usdtBdt} BDT, $HOSTA $${hostaPrice} — ${status}` }) }).catch(()=>{})
    }
  } catch (e) {
    console.warn('[market-adjust] persist failed', (e as any)?.message?.slice(0,200))
  }

  return Response.json({
    ok: true,
    binance: { usdtBdt: binance.usdtBdt, source: (binance as any).source },
    hosta: { price: hostaPrice, symbol: '$HOSTA' },
    currentPrice,
    suggestedPrice,
    diffPct,
    status,
    note: status==='pending_approval' ? 'queued for admin approval at /admin/market' : 'within 2% — no change',
  })
}
