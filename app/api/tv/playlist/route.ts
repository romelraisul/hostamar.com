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
    let items = await prisma.tvPlaylistItem.findMany({
      where: { channelId: channel.id },
      orderBy: { position: 'asc' },
      take: 100,
    })
    // Fallback: if playlist empty, serve recent videos from Video table so /tv never blank
    if (items.length === 0) {
      try {
        const videos = await (prisma as any).video?.findMany?.({ orderBy: { createdAt: 'desc' }, take: 12 }) || []
        items = videos.map((v: any, idx: number) => ({
          id: v.id,
          channelId: channel.id,
          videoId: v.id,
          title: v.title || v.prompt?.slice(0, 60) || `Video ${idx + 1}`,
          url: v.url || v.videoUrl || '',
          source: 'generated',
          position: idx,
          createdAt: v.createdAt,
        }))
      } catch {}
    }
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
