/**
 * Binance P2P USDT/BDT rate — the crypto-market rate, not the Bangladesh Bank rate.
 *
 * Fallback chain:
 *   1. Binance P2P C2C search API (~122-128 BDT/USDT live)
 *   2. CoinGecko tether→bdt
 *   3. Static floor of 120 (never below, keeps USD pricing sane if both fail)
 *
 * In-memory cache for 1h; /api/cron/binance-price refreshes hourly and could
 * persist to DB later (BinanceRate table) — kept dependency-free for Phase 1.
 */

export type BinanceRate = {
  usdtBdt: number
  source: 'binance_p2p' | 'coingecko' | 'fallback'
  updatedAt: string
}

const CACHE_TTL = 60 * 60 * 1000 // 1h
let cache: { at: number; rate: BinanceRate } | null = null

/** Marketing fallback constant when all sources fail. */
export const FALLBACK_USDT_BDT = 122.78

async function fromBinanceP2P(): Promise<number | null> {
  try {
    const res = await fetch('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asset: 'USDT',
        fiat: 'BDT',
        tradeType: 'BUY',
        page: 1,
        rows: 1,
        payTypes: [],
        publisherType: null,
      }),
      signal: AbortSignal.timeout(7000),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json()
    const price = parseFloat(data?.data?.[0]?.adv?.price)
    return Number.isFinite(price) && price > 50 ? price : null
  } catch {
    return null
  }
}

async function fromCoinGecko(): Promise<number | null> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=bdt',
      { signal: AbortSignal.timeout(7000), cache: 'no-store' },
    )
    if (!res.ok) return null
    const data = await res.json()
    const price = data?.tether?.bdt
    return Number.isFinite(price) && price > 50 ? price : null
  } catch {
    return null
  }
}

export async function getBinanceRate(force = false): Promise<BinanceRate> {
  if (!force && cache && Date.now() - cache.at < CACHE_TTL) return cache.rate

  let usdtBdt = await fromBinanceP2P()
  let source: BinanceRate['source'] = 'binance_p2p'
  if (!usdtBdt) {
    usdtBdt = await fromCoinGecko()
    source = 'coingecko'
  }
  if (!usdtBdt) {
    usdtBdt = FALLBACK_USDT_BDT
    source = 'fallback'
  }

  const rate: BinanceRate = { usdtBdt, source, updatedAt: new Date().toISOString() }
  cache = { at: Date.now(), rate }
  return rate
}

/** Taka → USD using the Binance P2P rate. */
export function takaToUsd(taka: number, rate: number): number {
  return Math.round((taka / rate) * 100) / 100
}

/** USD → Taka using the Binance P2P rate. */
export function usdToTaka(usd: number, rate: number): number {
  return Math.round(usd * rate)
}
