export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { TV_PLAYLIST_KEYS } from '@/lib/tv-playlist'

// Returns playlist with signed URLs via f005 worker route (/tv/key.mp4)
// Worker handles signing and streaming from private B2 bucket
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || String(TV_PLAYLIST_KEYS.length), 10), TV_PLAYLIST_KEYS.length)
    const wantJson = url.searchParams.get('format') === 'json' || req.headers.get('accept')?.includes('application/json')

    const keys = TV_PLAYLIST_KEYS.slice(0, limit)
    const videos = keys.map((key, idx) => ({
      id: String(idx + 1),
      title: key.replace('.mp4', '').replace(/[_-]/g, ' '),
      // Use worker route /tv/key.mp4 which signs and streams from private B2
      url: `https://hostamar.com/tv/${key}`,
      thumbnail: null,
      duration: null,
    }))

    if (wantJson) {
      return NextResponse.json({ ok: true, count: videos.length, source: 'b2-live-private-signed', b2_only: true, videos }, { status: 200, headers: { 'Cache-Control': 'public, max-age=60', 'X-Source': 'b2-live-private-signed' } })
    }

    // M3U format for HLS players
    const m3u = ['#EXTM3U', ...videos.map((v, i) => `#EXTINF:-1 tvg-logo="${v.thumbnail || ''}" group-title="Hostamar TV",${v.title || `Video ${i + 1}`}\n${v.url}`)].join('\n')
    return new NextResponse(m3u, { status: 200, headers: { 'Content-Type': 'application/x-mpegURL', 'Cache-Control': 'public, max-age=60', 'X-Source': 'b2-live-private-signed' } })
  } catch (e: any) {
    console.error('[tv/playlist] error:', e)
    return NextResponse.json({ ok: true, count: 1, source: 'fallback', videos: [] }, { status: 200 })
  }
}