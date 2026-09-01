import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { ensureFiverrCatalog } from '@/lib/pinned-chat'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * GET /api/ai-services/catalog — merged deduped catalog:
 * existing 50 + new unique Fiverr jobs (idempotently ensured) = ~105 unique.
 * Public (middleware allows), cached s-maxage 300 (next.config).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const search = searchParams.get('search')?.toLowerCase().trim()
  const before = await prisma.serviceCatalog.count().catch(() => 0)

  // Idempotent seed of the deduped new jobs (runs once per cold instance)
  await ensureFiverrCatalog().catch(() => 0)

  // V14: one-shot tier backfill for existing-50 services (not in the deduped
  // JSON) — priced from their own catalog creditCost via the pricing lib.
  try {
    const { priceService } = await import('@/lib/pricing/ai-services-pricing')
    const bare = await prisma.serviceCatalog.findMany({ where: { isActive: true } })
    for (const svc of bare) {
      const inp = svc.inputs as any
      if (!inp?.tiers) {
        const p = priceService(svc.id, svc.category, svc.creditCost)
        await prisma.serviceCatalog.update({
          where: { id: svc.id },
          data: { inputs: { ...inp, tiers: p.tiers, marketFiverrUSD: p.fiverrUSD, marketFiverrBDT: `৳${Math.round(p.fiverrAvgUSD * 120)}`, hostamarDiscountPct: p.hostamarDiscountPct } },
        }).catch(() => {})
      }
    }
  } catch {}

  const where: any = { isActive: true }
  if (category && category !== 'all') where.category = category
  const services = await prisma.serviceCatalog.findMany({ where, orderBy: { id: 'asc' } })

  // V13: normalize hyphens ↔ spaces so 'logo-design' matches 'Logo Design'
  const norm = (x: string) => x.toLowerCase().replace(/[-\s]+/g, '')
  const needle = norm(search || '')
  const filtered = search
    ? services.filter((s: any) =>
        norm(s.name).includes(needle) || norm(s.nameBn).includes(needle) ||
        norm(s.category).includes(needle) ||
        norm(s.benefit).includes(needle) || norm(s.benefitBn).includes(needle))
    : services

  const res = NextResponse.json({
    success: true,
    total: filtered.length,
    totalDeduped: services.length,
    addedNew: Math.max(0, services.length - before),
    duplicatesPolicy: 'semantic-dedup: existing card wins, new unique only',
    services: filtered.map((s: any) => ({
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
  res.headers.set('Cache-Control', 'public, s-maxage=3600, max-age=300, stale-while-revalidate=86400')
  return res
}
