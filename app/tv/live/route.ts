import { NextResponse } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// PC-OFF-SAFE: every URL below is hostamar.com/tv/*.mp4 (Vercel origin + CF edge),
// which survives the box being off. The old B2/CDN URLs pointed at a bucket that
// does not exist (404) and at cdn.hostamar.com which is unreachable from this box.
const EDGE = 'https://hostamar.com/tv'
export async function GET() {
  let videoList: string[] = []
  try {
    const res = await fetch(`${EDGE}/manifest.json`, { cache: 'no-store' })
    if (res.ok) {
      const j = await res.json()
      if (j.videos) videoList = j.videos.map((v: string) => `${EDGE}/${v}`)
    }
  } catch {}
  if (videoList.length === 0) {
    videoList = [`${EDGE}/world-in-numbers.mp4`, `${EDGE}/code-to-screen.mp4`, `${EDGE}/receipt-sovereign-video-os-narrated.mp4`]
  }
  let m3u8 = '#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:10\n#EXT-X-MEDIA-SEQUENCE:0\n'
  for (const v of videoList) {
    m3u8 += `#EXTINF:10.0,\n${v}\n`
  }
  m3u8 += '#EXT-X-ENDLIST\n'
  return new NextResponse(m3u8, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate:300',
      'Access-Control-Allow-Origin': '*',
      'X-Hostamar-TV': 'live-nonstop-v44-edge-shelf',
    }
  })
}