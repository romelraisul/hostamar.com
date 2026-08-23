export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureSchema } from '@/lib/ensure-schema'

/**
 * GET /api/admin/tv/settings (admin) — returns TvSettings
 * PUT /api/admin/tv/settings (admin) — upserts TvSettings
 * Body: { channelName, hlsUrl, rtmpUrl, tunnelAutoUrl, autoGenerate, rssFeeds: string[] }
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    await ensureSchema()
    let settings = await (prisma as any).tvSettings.findFirst()
    if (!settings) {
      settings = await (prisma as any).tvSettings.create({ data: { id: 'default', channelName: 'Hostamar TV' } }).catch(() => null)
    }
    return NextResponse.json({ ok: true, settings })
  } catch (err: any) {
    const status = err?.cause?.status || 500
    if (status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin(req)
    await ensureSchema()
    const body = await req.json().catch(() => ({}))
    const data: any = {}
    if (typeof body.channelName === 'string') data.channelName = body.channelName.slice(0, 100)
    if (typeof body.hlsUrl === 'string') data.hlsUrl = body.hlsUrl.slice(0, 500) || null
    if (typeof body.rtmpUrl === 'string') data.rtmpUrl = body.rtmpUrl.slice(0, 500) || null
    if (typeof body.tunnelAutoUrl === 'string') data.tunnelAutoUrl = body.tunnelAutoUrl.slice(0, 500) || null
    if (typeof body.autoGenerate === 'boolean') data.autoGenerate = body.autoGenerate
    if (Array.isArray(body.rssFeeds)) data.rssFeeds = body.rssFeeds.map((s: any) => String(s).slice(0, 300)).filter(Boolean)

    let settings = await (prisma as any).tvSettings.findFirst()
    if (settings) {
      settings = await (prisma as any).tvSettings.update({ where: { id: settings.id }, data })
    } else {
      settings = await (prisma as any).tvSettings.create({ data: { id: 'default', ...data } })
    }
    return NextResponse.json({ ok: true, settings })
  } catch (err: any) {
    const status = err?.cause?.status || 500
    if (status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('[admin/tv/settings] error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
