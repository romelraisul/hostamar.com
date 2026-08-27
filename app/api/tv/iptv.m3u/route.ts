import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export async function GET(req: NextRequest) {
  const m3u = `#EXTM3U
# Support Hostamar - bKash: 01822417463 (Premium 199 BDT/month for 6 channels)
# Free: 2 channels | Premium: /api/billing/premium-iptv?key=YOUR_API_KEY
#EXTINF:-1 tvg-name="Hostamar TV" group-title="Live",Hostamar TV
https://hostamar.com/hls/tv/index.m3u8
#EXTINF:-1 tvg-name="Hostamar TV 2" group-title="Free",Hostamar TV 2
https://hostamar.com/hls/tv2/index.m3u8
`
  return new NextResponse(m3u, {
    headers: {
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
    },
  })
}
