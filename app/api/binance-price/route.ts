import { getBinanceRate } from '@/lib/binance'
import { HOSTING_PLANS, WELCOME_CREDITS } from '@/lib/pricing'

export const dynamic = 'force-dynamic'

/**
 * GET /api/binance-price — live USDT/BDT (Binance P2P first) + converted anchors.
 * Public: read-only market data, no secrets.
 */
export async function GET() {
  const rate = await getBinanceRate()
  const takaToUsd = (t: number) => Math.round((t / rate.usdtBdt) * 100) / 100

  return Response.json(
    {
      usdtBdt: rate.usdtBdt,
      source: rate.source,
      updatedAt: rate.updatedAt,
      takaToUsd: 1 / rate.usdtBdt,
      usdToTaka: rate.usdtBdt,
      welcome: {
        credits: WELCOME_CREDITS,
        taka: WELCOME_CREDITS,
        usd: takaToUsd(WELCOME_CREDITS),
      },
      plans: Object.fromEntries(
        Object.entries(HOSTING_PLANS).map(([k, p]) => [k, { priceTaka: p.price, priceUsd: takaToUsd(p.price) }]),
      ),
    },
    { headers: { 'Cache-Control': 'public, max-age=300' } },
  )
}
