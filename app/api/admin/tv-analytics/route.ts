export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { env } from '@/lib/env'

// GET /api/admin/tv-analytics — view stats, top channels, live status
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 86400000)
    const monthAgo = new Date(today.getTime() - 30 * 86400000)

    const [todayViews, weekViews, monthViews, totalViews, topChannels, apiCalls] = await Promise.all([
      prisma.tvView.count({ where: { createdAt: { gte: today } } }),
      prisma.tvView.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.tvView.count({ where: { createdAt: { gte: monthAgo } } }),
      prisma.tvView.count(),
      prisma.tvIptvChannel.findMany({ orderBy: { views: 'desc' }, take: 20, select: { id: true, name: true, views: true, country: true, category: true } }),
      prisma.tvView.count({ where: { referer: { not: null, contains: 'hostamar.com' } } }),
    ])

    // External embeds = views from outside hostamar.com
    const externalEmbeds = totalViews - apiCalls

    // Top stable channels (from TvChannelStability table)
    let topStable: any[] = []
    try {
      const prismaAny = prisma as any
      const stableRows = await prismaAny.tvChannelStability.findMany({
        orderBy: [{ stabilityScore: 'desc' }, { popularityScore: 'desc' }],
        take: 10,
        include: { channel: { select: { id: true, name: true, url: true, logo: true } } },
      }).catch(async () => {
        // Fallback if relation not yet pushed: manual join
        const rows = await prismaAny.tvChannelStability.findMany({
          orderBy: [{ stabilityScore: 'desc' }, { popularityScore: 'desc' }],
          take: 10,
        })
        const byId = new Map((await prisma.tvIptvChannel.findMany({ where: { id: { in: rows.map((r: any) => r.channelId) } } })).map((c: any) => [c.id, c]))
        return rows.map((r: any) => ({ ...r, channel: byId.get(r.channelId) || null }))
      })
      topStable = stableRows.map((r: any) => ({
        id: r.channelId,
        name: r.channel?.name || r.channelId,
        stabilityScore: r.stabilityScore,
        popularityScore: r.popularityScore,
        successCount: r.successCount,
        failCount: r.failCount,
        avgLoadTimeMs: r.avgLoadTimeMs,
      }))
    } catch {}

    // Ad clicks stats
    let adClicks = { today: 0, week: 0, month: 0, revenue30d: 0, topAds: [] as any[] }
    try {
      const prismaAny = prisma as any
      const [aToday, aWeek, aMonth] = await Promise.all([
        prismaAny.tvAdClick.count({ where: { createdAt: { gte: today } } }).catch(() => 0),
        prismaAny.tvAdClick.count({ where: { createdAt: { gte: weekAgo } } }).catch(() => 0),
        prismaAny.tvAdClick.count({ where: { createdAt: { gte: monthAgo } } }).catch(() => 0),
      ])
      adClicks.today = aToday; adClicks.week = aWeek; adClicks.month = aMonth
      adClicks.revenue30d = (aMonth * 0.5) / 1000
      try {
        const grouped = await prismaAny.tvAdClick.groupBy({
          by: ['adKey'], where: { createdAt: { gte: monthAgo } },
          _count: { adKey: true }, orderBy: { _count: { adKey: 'desc' } }, take: 5,
        })
        for (const g of grouped) {
          const sample = await prismaAny.tvAdClick.findFirst({ where: { adKey: g.adKey }, select: { adText: true }, orderBy: { createdAt: 'desc' } })
          adClicks.topAds.push({ adKey: g.adKey, adText: sample?.adText || g.adKey, count: g._count.adKey })
        }
      } catch {}
    } catch {}

    // Storage B2 stats (via S3 list, non-blocking)
    let storageB2: any = { count: 0, usedLabel: '—' }
    try {
      const { S3Client, ListObjectsV2Command } = await import('@aws-sdk/client-s3')
      const s3 = new S3Client({
        endpoint: process.env.B2_ENDPOINT ?? 'https://s3.us-east-005.backblazeb2.com',
        region: process.env.B2_REGION ?? 'us-east-005',
        credentials: {
          accessKeyId: process.env.B2_ACCOUNT_ID ?? '',
          secretAccessKey: process.env.B2_APPLICATION_KEY ?? '',
        },
        forcePathStyle: true,
      })
      const resp: any = await s3.send(new ListObjectsV2Command({ Bucket: process.env.B2_BUCKET ?? 'hostamar-prod', MaxKeys: 1000 }))
      storageB2.count = resp.KeyCount ?? resp.Contents?.length ?? 0
      const totalBytes = (resp.Contents || []).reduce((s: number, o: any) => s + (o.Size || 0), 0)
      storageB2.usedLabel = totalBytes < 1024 * 1024 ? `${(totalBytes / 1024).toFixed(1)} KB` : `${(totalBytes / 1024 / 1024).toFixed(2)} MB`
    } catch {}

    // Live status: check data/live.json (set by PC cron or manual POST)
    let liveNow: { platform: string; title: string; viewers: number } | null = null
    try {
      const fs = await import('fs')
      const live = JSON.parse(fs.readFileSync('data/live.json', 'utf-8'))
      if (live?.isLive) liveNow = { platform: live.platform, title: live.title, viewers: live.viewers || 0 }
    } catch {}

    return NextResponse.json({
      totalViews,
      todayViews,
      weekViews,
      monthViews,
      topChannels,
      apiCalls,
      externalEmbeds,
      liveNow,
      cpm: Number(env.ADMIN_TV_CPM || process.env.ADMIN_TV_CPM || '2.5'),
      topStable,
      adClicks,
      storageB2,
    })
  } catch (err) {
    console.error('[admin/tv-analytics] error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

// POST /api/admin/tv-analytics — set Facebook LIVE URL (manual fallback)
export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)
    const body = await req.json().catch(() => ({}))
    const fbUrl = body.facebookLiveUrl?.trim()
    if (!fbUrl) return NextResponse.json({ error: 'Missing facebookLiveUrl' }, { status: 400 })

    // Extract video id from URL
    const match = fbUrl.match(/facebook\.com\/(?:[\w.]+\/)?videos\/(\d+)/)
    const videoId = match?.[1]
    if (!videoId) return NextResponse.json({ error: 'Could not parse Facebook video ID' }, { status: 400 })

    // Write to data/live.json for /api/tv/status to pick up
    const fs = await import('fs')
    const path = 'data/live.json'
    let existing: any = {}
    try { existing = JSON.parse(fs.readFileSync(path, 'utf-8')) } catch {}
    existing.isLive = true
    existing.platform = 'FACEBOOK'
    existing.videoId = videoId
    existing.title = `Facebook LIVE (${videoId})`
    existing.updatedAt = new Date().toISOString()
    fs.mkdirSync('data', { recursive: true })
    fs.writeFileSync(path, JSON.stringify(existing, null, 2))

    return NextResponse.json({ ok: true, videoId })
  } catch (err) {
    console.error('[admin/tv-analytics] post error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
