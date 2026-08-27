export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/tv/channels (public)
 * Returns iptv-org channels from TvIptvChannel table (1200 free-to-air).
 * Query: ?country=bd&category=News&limit=50&page=1
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const country = searchParams.get('country')
    const category = searchParams.get('category')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1)
    const skip = (page - 1) * limit

    const where: any = {}
    if (country) where.country = country
    if (category) where.category = { contains: category, mode: 'insensitive' }

    const [items, total] = await Promise.all([
      prisma.tvIptvChannel.findMany({
        where,
        orderBy: { views: 'desc' },
        take: limit,
        skip,
        select: { id: true, name: true, url: true, logo: true, category: true, country: true, views: true },
      }),
      prisma.tvIptvChannel.count({ where }),
    ])

    return NextResponse.json({
      ok: true,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      items: items.map((c) => ({
        id: c.id,
        title: c.name,
        url: c.url,
        logo: c.logo,
        category: c.category,
        country: c.country,
        source: 'iptv',
        position: 0,
      })),
    })
  } catch (err) {
    console.error('[tv/channels] error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
