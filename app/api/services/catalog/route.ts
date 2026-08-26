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

  return NextResponse.json(
    {
      success: true,
      total: services.length,
      services,
    },
    { headers: { 'Cache-Control': 'public, max-age=60' } }
  )
}
