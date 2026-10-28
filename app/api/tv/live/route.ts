export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// Edge shelf: our own git-tracked mp4s served via Vercel+CF at hostamar.com/tv/*.mp4
// PC-off-safe, Cloudflare-cached, verified 200. Replaces dead B2 allPrivate URLs.
const EDGE_BASE = 'https://hostamar.com/tv/'

export async function GET(req: NextRequest) {
  try {
    // Fetch the shelf index from our own edge (fast, cached)
    const res = await fetch('https://hostamar.com/tv/', {
      next: { revalidate: 60 }
    })
    
    let keys: string[] = []
    if (res.ok) {
      const html = await res.text()
      // Extract mp4 filenames from the directory index or known pattern
      // Our shelf: receipt-*.mp4, world-in-numbers.mp4, submarine-cables-*.mp4, etc.
      const matches = html.match(/href="([^"]+\.mp4)"/g)
      if (matches) {
        keys = matches.map(m => m.match(/href="([^"]+\.mp4)"/)?.[1]).filter(Boolean) as string[]
      }
    }
    
    // Fallback: known verified edge files (from git ls-tree)
    if (keys.length === 0) {
      keys = [
        'world-in-numbers.mp4',
        'receipt-om12-pipelines-narrated.mp4',
        'submarine-cables-episode-narrated.mp4',
        'trillion-market-episode-narrated.mp4',
        'twelve-pipelines-episode-narrated.mp4',
        'vertical-forest-episode-narrated.mp4',
        'video-ads-ad-builder-narrated.mp4',
        'receipt-agent-cloud-gpu.mp4',
        'receipt-agent-cloud-infra-narrated.mp4',
        'receipt-agent-cloud-pricing.mp4',
        'receipt-agent-fleet.mp4',
        'receipt-agentcloud-49-narrated.mp4',
        'receipt-agentcloud-49.mp4',
        'receipt-agentcloud-fleet.mp4',
        'receipt-agentcloud-new-narrated.mp4',
        'receipt-agentcloud.mp4',
        'receipt-agentcloudbn-narrated.mp4',
        'submarine-cables-episode.mp4',
        'trillion-market-episode-v2-narrated.mp4',
        'trillion-market-episode-v2-narrated2.mp4',
        'vertical-forest-episode.mp4',
      ]
    }

    // Build m3u8 playlist
    let m3u8 = '#EXTM3U\n'
    m3u8 += '#EXT-X-VERSION:3\n'
    m3u8 += '#EXT-X-TARGETDURATION:10\n'
    m3u8 += '#EXT-X-MEDIA-SEQUENCE:0\n'
    m3u8 += '#EXT-X-PLAYLIST-TYPE:EVENT\n'

    for (const key of keys) {
      const url = `${EDGE_BASE}${key}`
      m3u8 += `#EXTINF:10.0,\n${url}\n`
    }

    m3u8 += '#EXT-X-ENDLIST\n'

    return new NextResponse(m3u8, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'public, max-age=30, s-maxage=60',
        'Access-Control-Allow-Origin': '*',
        'X-Hostamar-TV': 'edge-shelf-v1',
      }
    })
  } catch {
    // Ultimate fallback: single verified edge mp4
    const m3u8 = `#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:10\n#EXT-X-MEDIA-SEQUENCE:0\n#EXT-X-PLAYLIST-TYPE:EVENT\n#EXTINF:10.0,\n${EDGE_BASE}world-in-numbers.mp4\n#EXT-X-ENDLIST\n`
    return new NextResponse(m3u8, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'public, max-age=30, s-maxage=60',
        'Access-Control-Allow-Origin': '*',
        'X-Hostamar-TV': 'edge-shelf-fallback',
      }
    })
  }
}