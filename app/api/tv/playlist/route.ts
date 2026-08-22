export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureSchema } from '@/lib/ensure-schema'
import { getOrCreateDefaultChannel } from '@/lib/tv/generator'

/**
 * GET /api/tv/playlist  (public)
 * Returns the ordered playlist for the channel (used by /tv player + streamer).
 */
export async function GET(req: NextRequest) {
  try {
    await ensureSchema()
    const channel = await getOrCreateDefaultChannel()
    const items = await prisma.tvPlaylistItem.findMany({
      where: { channelId: channel.id },
      orderBy: { position: 'asc' },
      take: 100,
    })
    return NextResponse.json({
      ok: true,
      channelId: channel.id,
      channelName: channel.name,
      isLive: channel.isLive,
      count: items.length,
      items: items.map((i) => ({
        id: i.id,
        title: i.title,
        url: i.url,
        source: i.source,
        position: i.position,
        videoId: i.videoId,
      })),
    })
  } catch (err) {
    console.error('[tv/playlist] error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
