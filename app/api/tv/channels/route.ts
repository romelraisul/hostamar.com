export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Fallback demo channels (test-streams.mux.dev — works immediately, no DB needed)
const DEMO_CHANNELS = [
  { id: 'demo-1', title: 'Big Buck Bunny', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', logo: '', category: 'Entertainment', country: 'global', source: 'iptv', position: 0 },
  { id: 'demo-2', title: 'Sintel (Test Stream)', url: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8', logo: '', category: 'Movies', country: 'global', source: 'iptv', position: 1 },
  { id: 'demo-3', title: 'Tears of Steel', url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8', logo: '', category: 'Movies', country: 'global', source: 'iptv', position: 2 },
  { id: 'demo-4', title: 'Test Pattern', url: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8', logo: '', category: 'Live', country: 'global', source: 'iptv', position: 3 },
  { id: 'demo-5', title: 'Apple Test', url: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8', logo: '', category: 'Test', country: 'global', source: 'iptv', position: 4 },
  { id: 'demo-6', title: 'Live Test 1', url: 'https://stream.mux.com/v69RSHhFelSmT75q0BHfKjfc/JzG6Yq5E8t.m3u8', logo: '', category: 'Live', country: 'global', source: 'iptv', position: 5 },
  { id: 'demo-7', title: 'Sample Video', url: 'https://download.samplelib.com/mp4/sample-30s.mp4', logo: '', category: 'Entertainment', country: 'global', source: 'iptv', position: 6 },
  { id: 'demo-8', title: 'Big Buck Bunny (Alt)', url: 'https://test-streams.mux.dev/x36xhzz/url_6/193039199_mp4_h264_aac_7.m3u8', logo: '', category: 'Entertainment', country: 'global', source: 'iptv', position: 7 },
  { id: 'demo-9', title: 'Elephant Dream', url: 'https://test-streams.mux.dev/x36xhzz/url_0/193039199_mp4_h264_aac_7.m3u8', logo: '', category: 'Movies', country: 'global', source: 'iptv', position: 8 },
  { id: 'demo-10', title: 'For Bigger Blazes', url: 'https://test-streams.mux.dev/x36xhzz/url_4/193039199_mp4_h264_aac_7.m3u8', logo: '', category: 'Entertainment', country: 'global', source: 'iptv', position: 9 },
]

/**
 * GET /api/tv/channels (public)
 * Returns iptv-org channels from TvIptvChannel table, with graceful fallback to demo channels.
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

    // Try DB first
    try {
      const where: any = {}
      if (country) where.country = country
      if (category) where.category = { contains: category, mode: 'insensitive' }

      const [items, total] = await Promise.all([
        prisma.tvIptvChannel.findMany({
          where,
          orderBy: [
            { country: 'asc' }, // bd first (if filtered) then global
            { views: 'desc' },
          ],
          take: limit,
          skip,
          select: { id: true, name: true, url: true, logo: true, category: true, country: true, views: true },
        }),
        prisma.tvIptvChannel.count({ where }),
      ])

      if (items.length > 0) {
        return NextResponse.json({
          ok: true,
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
          source: 'db',
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
      }
    } catch {
      // Table doesn't exist or DB unreachable — fall through to demo
    }

    // Fallback: demo channels (always works)
    const filtered = DEMO_CHANNELS.filter((c) => {
      if (country && c.country !== country && c.country !== 'global') return false
      if (category && c.category.toLowerCase() !== category.toLowerCase()) return false
      return true
    })
    const items = filtered.slice(skip, skip + limit)

    return NextResponse.json({
      ok: true,
      total: filtered.length,
      page,
      limit,
      pages: Math.ceil(filtered.length / limit),
      source: 'demo',
      items,
    })
  } catch (err) {
    console.error('[tv/channels] error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
