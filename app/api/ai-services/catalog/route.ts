import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { ensureFiverrCatalog } from '@/lib/pinned-chat'

export const runtime = 'nodejs'
export const revalidate = 3600
// FORGE 09-15: was force-dynamic + req.url param reads with ZERO server-side
// callers (dashboard filters client-side, grep-verified) → Vercel edge stripped
// s-maxage/SWR, every hit was MISS + full N+1 backfill. Seed (ensureFiverrCatalog)
// now runs in a 60s in-process window (same cold-instance cadence as before);
// the per-request tier backfill loop was dropped — all 106 rows were already
// backfilled by V14, the read below still serves any tiers present in DB.
let lastSeed = 0

async function serve() {
  if (Date.now() - lastSeed > 60_000) {
    lastSeed = Date.now()
    await ensureFiverrCatalog().catch(() => 0)
  }
  const services = await prisma.serviceCatalog.findMany({ where: { isActive: true }, orderBy: { id: 'asc' } })
  const res = NextResponse.json({
    success: true,
    total: services.length,
    totalDeduped: services.length,
    duplicatesPolicy: 'semantic-dedup: existing card wins, new unique only',
    services: services.map((s: any) => ({
      id: s.id, name: s.name, nameBn: s.nameBn,
      category: s.category, categoryBn: s.categoryBn,
      creditCost: s.creditCost, dollarRange: s.dollarRange,
      benefit: s.benefit, benefitBn: s.benefitBn,
      perfectFor: s.perfectFor, perfectForBn: s.perfectForBn,
      model: s.model, icon: s.icon,
      inputs: (s.inputs as any)?.fields || [],
      tiers: (s.inputs as any)?.tiers || null,
      marketFiverrUSD: (s.inputs as any)?.marketFiverrUSD || s.dollarRange,
      marketFiverrBDT: (s.inputs as any)?.marketFiverrBDT || null,
      hostamarDiscountPct: (s.inputs as any)?.hostamarDiscountPct || null,
    })),
  })
  // V23 Fluid-CPU fix: 1h CDN cache + 24h stale-while-revalidate — the 106-service
  // catalog changes ~monthly; every request re-running the DB merge burns CPU.
  res.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400')
  return res
}

export { serve as GET }
