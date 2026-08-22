export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureSchema } from '@/lib/ensure-schema'
import { getOrCreateDefaultChannel } from '@/lib/tv/generator'

const VALID_PLATFORMS = ['YOUTUBE', 'FACEBOOK', 'TWITCH', 'CUSTOM']

/**
 * GET  /api/tv/destinations  (admin) — list stream destinations
 * POST /api/tv/destinations  (admin) — add a destination { platform, rtmpUrl, streamKey, label? }
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    await ensureSchema()
    const channel = await getOrCreateDefaultChannel()
    const destinations = await prisma.tvStreamDestination.findMany({
      where: { channelId: channel.id },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({
      ok: true,
      validPlatforms: VALID_PLATFORMS,
      destinations: destinations.map((d) => ({
        id: d.id,
        platform: d.platform,
        rtmpUrl: d.rtmpUrl,
        streamKeyMasked: d.streamKey ? `${d.streamKey.slice(0, 4)}...${d.streamKey.slice(-4)}` : '',
        label: d.label,
        isActive: d.isActive,
        lastError: d.lastError,
      })),
    })
  } catch (err: any) {
    const status = err?.cause?.status || 500
    if (status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('[tv/destinations] GET error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)
    await ensureSchema()

    const body = await req.json().catch(() => ({}))
    const platform = String(body.platform || '').toUpperCase()
    const rtmpUrl = String(body.rtmpUrl || '').trim()
    const streamKey = String(body.streamKey || '').trim()
    const label = body.label ? String(body.label).slice(0, 100) : null

    if (!VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json({ error: 'INVALID_PLATFORM', message: `platform must be one of: ${VALID_PLATFORMS.join(', ')}` }, { status: 400 })
    }
    if (!rtmpUrl || !/^rtmps?:\/\//.test(rtmpUrl)) {
      return NextResponse.json({ error: 'INVALID_RTMP_URL', message: 'rtmpUrl must start with rtmp:// or rtmps://' }, { status: 400 })
    }
    if (!streamKey) {
      return NextResponse.json({ error: 'INVALID_STREAM_KEY', message: 'streamKey is required' }, { status: 400 })
    }

    const channel = await getOrCreateDefaultChannel()
    const destination = await prisma.tvStreamDestination.create({
      data: {
        channelId: channel.id,
        platform,
        rtmpUrl,
        streamKey,
        label,
        isActive: true,
      },
    })

    return NextResponse.json({
      ok: true,
      destination: {
        id: destination.id,
        platform: destination.platform,
        rtmpUrl: destination.rtmpUrl,
        label: destination.label,
        isActive: destination.isActive,
      },
      message: 'Destination added. It will be used on the next stream start.',
    })
  } catch (err: any) {
    const status = err?.cause?.status || 500
    if (status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('[tv/destinations] POST error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
