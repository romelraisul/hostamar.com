export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getTvConfig } from '@/lib/tv/config'
import { testHlsUrl } from '@/lib/tunnel/cloudflare'

/**
 * GET /api/tv/status (public)
 * Returns live status for the dashboard + /tv public page.
 */
export async function GET() {
  try {
    // Get HLS config
    const cfg = await getTvConfig()
    let hlsReachable = false
    if (cfg.hlsUrl) {
      try {
        const r = await testHlsUrl(cfg.hlsUrl)
        hlsReachable = r.reachable
      } catch {}
    }

    // Count iptv channels
    let iptvChannels = 0
    try {
      iptvChannels = await prisma.tvIptvChannel.count()
    } catch {}

    // Check for Facebook LIVE override
    let liveNow: { platform: string; title: string; viewers: number } | null = null
    try {
      const fs = await import('fs')
      const live = JSON.parse(fs.readFileSync('data/live.json', 'utf-8'))
      if (live?.isLive) {
        liveNow = { platform: live.platform, title: live.title, viewers: live.viewers || 0 }
      }
    } catch {}

    return NextResponse.json({
      ok: true,
      isLive: hlsReachable,
      liveSince: null,
      channelName: cfg.channelName || 'Hostamar TV',
      playlistLength: iptvChannels,
      tvPlaylistCount: iptvChannels,
      videoCount: 0,
      destinations: [],
      autoGenerateEnabled: cfg.autoGenerate,
      hlsUrl: cfg.hlsUrl,
      rtmpUrl: cfg.rtmpUrl,
      mode: 'local_pc',
      tunnelConfigured: cfg.tunnelConfigured,
      hlsReachable,
      agentLastSeen: null,
      iptvChannels,
      liveNow,
    })
  } catch (err) {
    console.error('[tv/status] error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
