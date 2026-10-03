import { NextResponse } from 'next/server'
import { getTursoEdgeClient } from '@/lib/turso-edge'

// Runs per-request: the catalog must reflect the live DB, and the cached
// prerender path served a stale zero-row body under OpenNext.
export const dynamic = 'force-dynamic'

/**
 * GET /api/services/catalog — public, isActive only. category/search were
 * NEVER used by any caller (StoreCatalog/lib/services/bridge cron all fetch
 * plain and filter client-side) and merely reading request.url kept this
 * route per-request dynamic -> Vercel edge stripped s-maxage/SWR from every
 * response (prod proved bare `max-age=60` on both 373832d AND 9e1b841 builds).
 * Zero request-data access = ISR-cacheable, exactly like /api/store/products.
 */
export async function GET() {
  let services: Array<Record<string, unknown>> = []
  try {
    const client = getTursoEdgeClient()
    const result = await client.execute(
      `SELECT id, name, nameBn, category, categoryBn, creditCost, dollarRange,
              benefit, benefitBn, perfectFor, perfectForBn, icon, isActive
       FROM ServiceCatalog WHERE isActive = 1 ORDER BY id ASC`
    )
    services = result.rows.map((r: any) => ({
      id: r.id, name: r.name, nameBn: r.nameBn, category: r.category,
      categoryBn: r.categoryBn, creditCost: r.creditCost, dollarRange: r.dollarRange,
      benefit: r.benefit, benefitBn: r.benefitBn, perfectFor: r.perfectFor,
      perfectForBn: r.perfectForBn, icon: r.icon, isActive: Number(r.isActive),
    }))
  } catch (e) {
    console.error('[catalog] DB read failed:', e)
  }

  return NextResponse.json(
    { success: true, total: services.length, services },
    { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600, stale-if-error=3600' } }
  )
}
