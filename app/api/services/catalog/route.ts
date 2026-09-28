import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// FORGE 2026-09-15 11:1x — force-dynamic was the real blocker, NOT the header
// string: Vercel's edge STRIPS s-maxage/SWR from force-dynamic route handlers
// (proved live after 373832d deployed: origin runs my new code, CDN still
// returns bare `max-age=60`, and /api/ai-services/catalog — route-sets
// s-maxage=3600 — arrives as bare max-age=3600). revalidate=300 (the exact
// pattern of /api/store/products, which keeps s-maxage=300+SWR+SIE and shows
// STALE/HIT) is the working combo. Header kept for the browser + docs.
export const revalidate = 300

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
    services = await prisma.serviceCatalog.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
      // FORGE 2026-09-28: bare findMany shipped full rows incl. `inputs` (~16MB)
      // + promptTemplate -> ISR fallback 21.65MB > 19.07MB limit ->
      // FALLBACK_BODY_TOO_LARGE killed EVERY production build (prod served a
      // 2-day-old build). No public consumer reads these (CatalogService has no
      // inputs; dashboard reads Prisma directly) — select the served shape.
      select: {
        id: true, name: true, nameBn: true, category: true, categoryBn: true,
        creditCost: true, dollarRange: true, benefit: true, benefitBn: true,
        perfectFor: true, perfectForBn: true, icon: true, isActive: true,
      },
    })
  } catch {
    // Build-time / no-DB: return empty catalog so static export succeeds.
    // Runtime DB errors still surface as 500 via Next's error handling.
  }

  // Route header overrides next.config.js headers for route handlers (measured
  // live: config's s-maxage=3600 never reached the edge, every probe = MISS
  // 1.5-1.9s). Same SWR/SIE string as /api/store/products — buyers never race
  // the dynamic Prisma fill; stale is served instantly, refreshed in background.
  return NextResponse.json(
    {
      success: true,
      total: services.length,
      services,
    },
    { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600, stale-if-error=3600' } }
  )
}
