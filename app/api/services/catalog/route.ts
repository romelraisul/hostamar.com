import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/services/catalog?category=&search=
 * Public, filters isActive, returns 50 with nameBn
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const search = searchParams.get('search')?.toLowerCase().trim()

  const where: any = { isActive: true }
  if (category && category !== 'all') {
    where.category = category
  }

  let services = await prisma.serviceCatalog.findMany({
    where,
    orderBy: { id: 'asc' },
  })

  if (search) {
    services = services.filter(
      (s: any) =>
        s.name.toLowerCase().includes(search) ||
        s.nameBn.includes(search) ||
        s.category.toLowerCase().includes(search) ||
        s.categoryBn.includes(search) ||
        s.benefit.toLowerCase().includes(search) ||
        s.benefitBn.includes(search)
    )
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
