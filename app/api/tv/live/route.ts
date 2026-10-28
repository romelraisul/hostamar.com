export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

const CDN = 'https://f002.backblazeb2.com/file/hostamar-prod/tv/'

export async function GET(req: NextRequest) {
  try {
    // Fetch video list from B2 (cached via Cloudflare)
    const res = await fetch('https://f002.backblazeb2.com/file/hostamar-prod/tv/?list-type=2&prefix=&delimiter=/', {
      headers: { 'Accept': 'application/xml' },
      next: { revalidate: 60 }
    })
    
    if (!res.ok) {
      // Fallback: static playlist from known files
      return fallbackPlaylist()
    }

    const xml = await res.text()
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'application/xml')
    const keys = Array.from(doc.querySelectorAll('Key'))
      .map(k => k.textContent)
      .filter((k): k is string => k !== null && k.endsWith('.mp4'))
      .sort()

    if (keys.length === 0) {
      return fallbackPlaylist()
    }

    // Build m3u8 playlist
    let m3u8 = '#EXTM3U\n'
    m3u8 += '#EXT-X-VERSION:3\n'
    m3u8 += '#EXT-X-TARGETDURATION:10\n'
    m3u8 += '#EXT-X-MEDIA-SEQUENCE:0\n'
    m3u8 += '#EXT-X-PLAYLIST-TYPE:EVENT\n'

    for (const key of keys) {
      const url = `${CDN}${key}`
      m3u8 += `#EXTINF:10.0,\n${url}\n`
    }

    m3u8 += '#EXT-X-ENDLIST\n'

    return new NextResponse(m3u8, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'public, max-age=30, s-maxage=60',
        'Access-Control-Allow-Origin': '*',
        'X-Hostamar-TV': 'live-nonstop-v43.1',
      }
    })
  } catch {
    return fallbackPlaylist()
  }
}

function fallbackPlaylist() {
  // Known video files from B2 (first 50 for playlist)
  const known = [
    'product-hunt-demo.mp4',
    'receipt-gateway.mp4',
    'receipt-sovereign.mp4',
    'receipt-agentcloud.mp4',
    'receipt-hosting.mp4',
    'receipt-gpu.mp4',
    'receipt-memory.mp4',
    'receipt-tv.mp4',
    'receipt-cdn.mp4',
    'receipt-brain.mp4',
  ]

  let m3u8 = '#EXTM3U\n'
  m3u8 += '#EXT-X-VERSION:3\n'
  m3u8 += '#EXT-X-TARGETDURATION:10\n'
  m3u8 += '#EXT-X-MEDIA-SEQUENCE:0\n'
  m3u8 += '#EXT-X-PLAYLIST-TYPE:EVENT\n'

  for (const file of known) {
    const url = `${CDN}${file}`
    m3u8 += `#EXTINF:10.0,\n${url}\n`
  }

  m3u8 += '#EXT-X-ENDLIST\n'

  return new NextResponse(m3u8, {
    headers: {
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Cache-Control': 'public, max-age=30, s-maxage=60',
      'Access-Control-Allow-Origin': '*',
      'X-Hostamar-TV': 'live-nonstop-v43.1',
    }
  })
}