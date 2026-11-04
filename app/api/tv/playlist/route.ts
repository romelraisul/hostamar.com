export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { TV_PLAYLIST, TV_PLAYLIST_COUNT } from '@/lib/tv-playlist'

// ponytail: workerd cannot load Prisma 5.22's engine init (fs.readdir -> unenv
// throws -> every query swallowed as 500). Read Turso directly via the fetch-only
// /web client (same pattern as /api/tv/status + tv/watch). Upgrade path: none —
// Prisma stays on Vercel only.
/**
 * GET /api/tv/playlist  (public)
 * Returns the ordered playlist for the channel (used by /tv player + streamer).
 * Supports ?format=json for JSON, default returns M3U.
 * Supports ?limit=N to cap items (default 374).
 * Data is embedded at build time from manifest.json via generate-tv-playlist.mjs
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || String(TV_PLAYLIST_COUNT), 10), TV_PLAYLIST_COUNT)
    const wantJson = url.searchParams.get('format') === 'json' || req.headers.get('accept')?.includes('application/json')

    const videos = TV_PLAYLIST.slice(0, limit)

    if (wantJson) {
      return NextResponse.json({ ok: true, count: videos.length, source: 'b2-live-private', b2_only: true, videos }, { status: 200 })
    }

    // M3U format for HLS players
    const m3u = ['#EXTM3U', ...videos.map((v: any, i: number) => `#EXTINF:-1 tvg-logo="${v.thumbnail || ''}" group-title="Hostamar TV",${v.title || `Video ${i + 1}`}\n${v.url}`)].join('\n')
    return new NextResponse(m3u, { status: 200, headers: { 'Content-Type': 'application/x-mpegURL', 'Cache-Control': 'public, max-age=60' } })
  } catch (e: any) {
    console.error('[tv/playlist] error:', e)
    return NextResponse.json({ ok: true, count: 1, source: 'fallback', videos: [] }, { status: 200 })
  }
}