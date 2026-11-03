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
 * Supports ?format=json for JSON, default returns M3U.
 * Supports ?limit=N to cap items (default 374).
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '374', 10), 374)
    const wantJson = url.searchParams.get('format') === 'json' || req.headers.get('accept')?.includes('application/json')

    // Try Turso first (production)
    let videos: any[] = []
    try {
      const db = getTursoEdgeClient()
      const res = await db.execute({
        sql: 'SELECT "id", "title", "url", "thumbnail", "duration", "createdAt" FROM "Video" WHERE "status" = ? ORDER BY "createdAt" DESC LIMIT ?',
        args: ['published', limit]
      })
      videos = res.rows.map((r: any) => ({
        id: String(r.id),
        title: String(r.title || 'Untitled'),
        url: String(r.url || ''),
        thumbnail: r.thumbnail ? String(r.thumbnail) : null,
        duration: r.duration ? Number(r.duration) : null,
      })).filter((v: any) => v.url && v.url.includes('hostamar'))
    } catch (err) {
      console.log('[tv/playlist] Turso unavailable, trying B2 manifest:', err)
    }

    // Fallback: B2 manifest (tv.json from f005)
    if (videos.length === 0) {
      try {
        const r = await fetch('https://f005.hostamar.com/file/hostamar-prod/tv.json', { next: { revalidate: 60 }, cache: 'no-store' })
        if (r.ok) {
          const j = await r.json() as any
          const manifestVideos = Array.isArray(j) ? j : (j.videos || [])
          videos = manifestVideos
            .slice(0, limit)
            .map((v: any, idx: number) => ({
              id: String(v.id || v.videoId || idx),
              title: String(v.title || v.fn || `Video ${idx + 1}`),
              url: String(v.url || `https://f005.hostamar.com/file/hostamar-prod/${v.fn || ''}`),
              thumbnail: v.thumbnail ? String(v.thumbnail) : null,
              duration: v.duration ? Number(v.duration) : null,
            }))
            .filter((v: any) => v.url && v.url.includes('hostamar'))
        }
      } catch (err) {
        console.log('[tv/playlist] B2 manifest fallback failed:', err)
      }
    }

    // Last resort: return mock so /tv never blank
    if (videos.length === 0) {
      videos = [
        { id: '1', title: 'Hostamar AI Video Demo', url: 'https://f005.hostamar.com/file/hostamar-prod/tv/HostamarH3_00001_.mp4', thumbnail: null, duration: null },
        { id: '2', title: 'Hostamar Platform Overview', url: 'https://f005.hostamar.com/file/hostamar-prod/tv/HostamarH3_00002_.mp4', thumbnail: null, duration: null },
        { id: '3', title: 'AI Video Generation Tutorial', url: 'https://f005.hostamar.com/file/hostamar-prod/tv/HostamarH3_00003_.mp4', thumbnail: null, duration: null },
      ]
    }

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