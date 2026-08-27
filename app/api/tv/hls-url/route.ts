export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTvConfig } from '@/lib/tv/config'
import { testHlsUrl } from '@/lib/tunnel/cloudflare'
import { getClientIp } from '@/lib/rate-limit'

// ALLOWED_HOSTS — only these can be proxied (security: no open proxy)
const ALLOWED_HOSTS = [
  'iptv-org.github.io',
  'raw.githubusercontent.com',
  'test-streams.mux.dev',
  'cph-p2p-msl.akamaized.net',
  'demo.unified-streaming.com',
  'devstreaming-cdn.apple.com',
  'commondatastorage.googleapis.com',
  'download.samplelib.com',
  'stream.mux.com',
]

function isAllowed(url: string): boolean {
  try {
    const host = new URL(url).hostname
    return ALLOWED_HOSTS.some((a) => host === a || host.endsWith(`.${a}`))
  } catch {
    return false
  }
}

/**
 * GET /api/tv/hls-url (public)
 * Returns HLS URL for a specific channel (id=xxx) or the tunnel HLS.
 * Logs TvView for monetization tracking.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const channelId = searchParams.get('id')

    // If id provided, look up the iptv channel
    if (channelId) {
      const channel = await prisma.tvIptvChannel.findUnique({ where: { id: channelId } })
      if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

      // Security: only allowlisted hosts
      if (!isAllowed(channel.url)) {
        return NextResponse.json({ error: 'Host not allowed' }, { status: 403 })
      }

      // Log view for monetization
      const ip = getClientIp(req)
      const userAgent = req.headers.get('user-agent') || undefined
      const referer = req.headers.get('referer') || undefined
      try {
        await prisma.tvView.create({ data: { channelId: channel.id, ip, userAgent, referer } })
        await prisma.tvIptvChannel.update({ where: { id: channel.id }, data: { views: { increment: 1 } } })
      } catch (e) {
        console.warn('[tv/hls-url] view log failed:', e)
      }

      return NextResponse.json({
        ok: true,
        url: channel.url,
        name: channel.name,
        logo: channel.logo,
        category: channel.category,
        country: channel.country,
        ad: { preRoll: '/ads/hostamar-5s.mp4' },
      })
    }

    // Fallback: tunnel HLS (old behavior)
    const cfg = await getTvConfig()
    let reachable = false
    let status: number | null = null
    if (cfg.hlsUrl) {
      const r = await testHlsUrl(cfg.hlsUrl)
      reachable = r.reachable
      status = r.status
    }
    return NextResponse.json({
      ok: true,
      hlsUrl: cfg.hlsUrl,
      isConfigured: cfg.isConfigured,
      source: cfg.source,
      tunnelConfigured: cfg.tunnelConfigured,
      reachable,
      status,
      rtmpUrl: cfg.rtmpUrl,
    })
  } catch (err) {
    console.error('[tv/hls-url] error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
