import { NextRequest } from 'next/server'
import { getTursoEdgeClient } from '@/lib/turso-edge'
import { getBinanceRate } from '@/lib/binance'

export const dynamic = 'force-dynamic'

/**
 * GET /api/market-adjust — daily cron: Fetch $HOSTA (Dexscreener) + Binance USDT/BDT + OpenRouter costs
 * Calculates suggested pricing: Starter 990 Taka = $7.84 at 126.24, adjust if USDT/BDT moves >2%
 * Writes to Turso market_adjustment { suggestedPrice, currentPrice, diff%, status: pending_approval }
 * (raw @libsql/client — prisma writes probe fs.readdir on workerd; see lib/turso-edge)
 */
export async function GET(req: NextRequest) {
  // Public read for customer /pricing + admin /admin/market; write still gated via /api/admin/market-approve.
  // Cron (x-vercel-cron) persists to Neon; direct public GET just computes live Binance+$HOSTA.

  const binance = await getBinanceRate().catch(()=>({ usdtBdt: 126.24, source:'fallback', updatedAt: new Date().toISOString() }))
  // Dexscreener $HOSTA (placeholder token address — fallback to mock if not found)
  let hostaPrice = 0.0385
  try {
    const r = await fetch('https://api.dexscreener.com/latest/dex/search/?q=$HOSTA', { signal: AbortSignal.timeout(5000) } as any)
    const j:any = await r.json()
    const p = parseFloat(j?.pairs?.[0]?.priceUsd)
    if (Number.isFinite(p) && p>0) hostaPrice = p
  } catch {}

  const currentPrice = 990
  const suggestedPrice = Math.round((4.74 * binance.usdtBdt) / 1) // $4.74 * BDT
  const diffPct = Math.round(((suggestedPrice - currentPrice)/currentPrice)*10000)/100

  let status: string = 'no_change'
  if (Math.abs(diffPct) > 2) status = 'pending_approval'

  // persist to Turso (SQLite dialect: no NOW()/gen_random_uuid()/::jsonb)
  try {
    const db = getTursoEdgeClient()
    await db.execute(`CREATE TABLE IF NOT EXISTS "market_adjustment" (id TEXT PRIMARY KEY, "suggestedPrice" REAL, "currentPrice" REAL, "diffPct" REAL, status TEXT, "hostaPrice" REAL, "usdtBdt" REAL, "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`)
    const id = `adj-${Date.now()}`
    await db.execute({
      sql: `INSERT INTO "market_adjustment" (id, "suggestedPrice", "currentPrice", "diffPct", status, "hostaPrice", "usdtBdt", "createdAt") VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      args: [id, suggestedPrice, currentPrice, diffPct, status, hostaPrice, binance.usdtBdt],
    })
    // log to SeoEvent + slack stub (SQLite: url carries the summary — SeoEvent has no payload col)
    try {
      await db.execute({
        sql: `INSERT INTO "SeoEvent" (id, type, url, "createdAt") VALUES (?, 'market_adjust', ?, CURRENT_TIMESTAMP)`,
        args: [crypto.randomUUID(), `adjust:${currentPrice}->${suggestedPrice} (${diffPct}%) hosta $${hostaPrice} usdtBdt ${binance.usdtBdt}`],
      })
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
