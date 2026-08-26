import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const HLS_URL = process.env.TV_HLS_URL || process.env.NEXT_PUBLIC_TV_HLS_URL || 'https://tv.hostamar.com/hls/live/tv/index.m3u8'

export async function GET(req: NextRequest) {
  try {
    const url = HLS_URL
    let pcAlive = false
    let staleSeconds: number | null = null
    let lastSegment: string | null = null
    let error: string | null = null
    let status = 0
    try {
      const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(8000) })
      status = res.status
      if (res.ok) {
        const text = await res.text()
        const hasExtinf = text.includes('#EXTINF')
        const segments = text.split('\n').filter(l => l.trim().endsWith('.ts') || l.includes('.ts'))
        lastSegment = segments[segments.length - 1]?.trim() || null
        // stale if playlist hasn't updated: check EXT-X-MEDIA-SEQUENCE or date
        if (hasExtinf && segments.length > 0) {
          pcAlive = true
          // try to parse last modified from playlist
          const dateMatch = text.match(/#EXT-X-PROGRAM-DATE-TIME:(.+)/)
          if (dateMatch) {
            const t = new Date(dateMatch[1]).getTime()
            if (!isNaN(t)) staleSeconds = Math.round((Date.now() - t) / 1000)
          } else {
            staleSeconds = 0
          }
        } else {
          error = 'No #EXTINF in playlist'
        }
      } else {
        error = `HLS fetch ${status}`
      }
    } catch (e: any) {
      error = e?.message || 'fetch failed'
    }

    return NextResponse.json({
      ok: true,
      pcAlive,
      staleSeconds,
      lastSegment,
      hlsUrl: url,
      status,
      error,
      at: new Date().toISOString(),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'heartbeat failed' }, { status: 500 })
  }
}
