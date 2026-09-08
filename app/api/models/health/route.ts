import { NextResponse } from 'next/server'
import { TOKENROUTER } from '@/lib/tokenrouter'

export const dynamic = 'force-dynamic'

/**
 * GET /api/models/health — CEO Models tab health check.
 * Returns the TokenRouter tier table (local-wsl / kaggle / edge / zoo)
 * with live status. Public to logged-in admin; no secrets in payload.
 */
export async function GET() {
  const tiers = TOKENROUTER.map((r) => ({
    tier: r.tier,
    model: r.model,
    url: r.url,
    creditCost: r.creditCost,
    status: r.status,
    note: r.note,
  }))
  const up = tiers.filter((t) => t.status === 'up').length
  return NextResponse.json(
    {
      ok: true,
      checkedAt: new Date().toISOString(),
      summary: { total: tiers.length, up, booting: tiers.filter((t) => t.status === 'booting').length, planned: tiers.filter((t) => t.status === 'planned').length },
      tiers,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
