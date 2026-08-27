import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export async function GET(req: NextRequest) {
  const m3u = `#EXTM3U
#EXTINF:-1 tvg-name="Hostamar TV" group-title="Live",Hostamar TV
https://hostamar.com/hls/tv/index.m3u8
`
  return new NextResponse(m3u, {
    headers: {
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
    },
  })
}
