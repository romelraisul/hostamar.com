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
