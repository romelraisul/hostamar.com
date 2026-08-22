export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureSchema } from '@/lib/ensure-schema'
import { getOrCreateDefaultChannel } from '@/lib/tv/generator'
import { getStreamStatus } from '@/lib/tv/streamer'

/**
 * GET /api/tv/now-playing  (public)
 * Returns live status + the current video title for the homepage TV hero.
 * Current item = lowest-position playlist entry; falls back to the most
 * recent generated Video (same fallback contract as /api/tv/playlist).
 */
export async function GET() {
  try {
    const status = await getStreamStatus()

    let title: string | null = null
    try {
      await ensureSchema()
      const channel = await getOrCreateDefaultChannel()
      const items = await prisma.tvPlaylistItem.findMany({
        where: { channelId: channel.id },
        orderBy: { position: 'asc' },
        take: 1,
      })
      if (items[0]?.title) {
        title = items[0].title
      } else {
        const video = await (prisma as any).video?.findFirst?.({
          orderBy: { createdAt: 'desc' },
          select: { title: true },
        })
        title = video?.title || null
      }
    } catch {
      // DB unavailable — still report live status, title stays null
    }

    return NextResponse.json({
      ok: true,
      isLive: status.isLive,
      hlsReachable: status.hlsReachable,
      hlsUrl: status.hlsUrl,
      channelName: status.channelName,
      title,
    })
  } catch (err) {
    console.error('[tv/now-playing] error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
