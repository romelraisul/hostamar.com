export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getTursoEdgeClient } from '@/lib/turso-edge'

// ponytail: workerd cannot load Prisma 5.22's engine init (fs.readdir -> unenv
// throws -> every query swallowed as 500). Read Turso directly via the fetch-only
// /web client (same pattern as /api/tv/status + tv/watch). Upgrade path: none —
// Prisma stays on Vercel only.
/**
 * GET /api/tv/playlist  (public)
 * Returns the ordered playlist for the channel (used by /tv player + streamer).
 */
export async function GET(req: NextRequest) {
  try {
    const db = getTursoEdgeClient()
    const chanRes = await db.execute(
      'SELECT "id", "name", "isLive" FROM "TvChannel" ORDER BY "createdAt" ASC LIMIT 1'
    )
    if (!chanRes.rows.length) {
      return NextResponse.json({ ok: true, error: 'NO_CHANNEL', count: 0, items: [] })
    }
    const channel = chanRes.rows[0] as unknown as { id: string; name: string; isLive: number | boolean }
    const channelId = channel.id

    // `played` is the retire flag: the no-repeat watcher sets it, and the
    // safety work retires third-party footage the same way. Without this filter
    // retired items keep airing, so filter here rather than at every caller.
    const res = await db.execute({
      sql: 'SELECT "id", "title", "url", "source", "position", "videoId" FROM "TvPlaylistItem" WHERE "channelId" = ? AND "played" = false ORDER BY "position" ASC LIMIT 100',
      args: [channelId],
    })
    let items = res.rows.map((r) => ({ ...(r as Record<string, unknown>) })) as Array<{
      id: string
      title: string
      url: string
      source: string
      position: number
      videoId: string | null
    }>

    // Fallback: if playlist empty, serve recent videos from Video table so /tv never blank
    if (items.length === 0) {
      try {
        const vidRes = await db.execute(
          'SELECT "id", "title", "prompt", "url", "videoUrl", "createdAt" FROM "Video" ORDER BY "createdAt" DESC LIMIT 12'
        )
        // HARD GUARD: only serve URLs on our own origin — stale Video rows can
        // point at expired B2 keys (401), which filled /tv with dead links.
        items = vidRes.rows
          .map((r) => ({ ...(r as Record<string, unknown>) }))
          .filter((v) => String(v.url || v.videoUrl || '').includes('hostamar.com'))
          .map((v, idx) => ({
            id: String(v.id),
            title: String(v.title || String(v.prompt || '').slice(0, 60) || `Video ${idx + 1}`),
            url: String(v.url || v.videoUrl || ''),
            source: 'generated',
            position: idx,
            videoId: String(v.id),
          }))
      } catch {}
    }

    return NextResponse.json({
      ok: true,
      channelId,
      channelName: channel.name,
      isLive: Boolean(channel.isLive),
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
