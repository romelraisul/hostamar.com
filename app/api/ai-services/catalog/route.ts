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

  const where: any = { isActive: true }
  if (category && category !== 'all') where.category = category
  const services = await prisma.serviceCatalog.findMany({ where, orderBy: { id: 'asc' } })

  const filtered = search
    ? services.filter((s: any) =>
        s.name.toLowerCase().includes(search) || s.nameBn.includes(search) ||
        s.category.toLowerCase().includes(search) ||
        s.benefit.toLowerCase().includes(search) || s.benefitBn.includes(search))
    : services

  return NextResponse.json({
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
    })),
  })
}
