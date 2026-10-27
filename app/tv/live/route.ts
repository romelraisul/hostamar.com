import { NextResponse } from 'next/server'
export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export async function GET() {
  // B2 source: https://f002.backblazeb2.com/file/hostamar-prod/tv/
  // Cloudflare CDN: https://cdn.hostamar.com/tv/
  const B2_CDN = 'https://f002.backblazeb2.com/file/hostamar-prod/tv'
  const CF_CDN = 'https://cdn.hostamar.com/tv'
  // List from b2 manifest — rclone ls b2:hostamar-prod/tv/ 142 mp4s
  // For Edge runtime, use static list cached 1h, revalidate via B2 API if needed
  const videos = [
    // will be injected from /app/api/tv manifest — 142 entries
  ]
  // Fallback: fetch manifest from B2 json if available
  let videoList = videos
  try {
    const res = await fetch(`${B2_CDN}/manifest.json`, { next: { revalidate: 3600 } })
    if (res.ok) { const j = await res.json(); if (j.videos) videoList = j.videos }
  } catch {}
  if (videoList.length === 0) {
    // hardcode 3 fallback to avoid empty
    videoList = [`${CF_CDN}/product-hunt-demo.mp4`, `${B2_CDN}/product-hunt-demo.mp4`]
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
      'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
      'Access-Control-Allow-Origin': '*',
      'X-Hostamar-TV': 'live-nonstop-v43.1',
    }
  })
}