export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getTvConfig } from '@/lib/tv/config'
import { testHlsUrl } from '@/lib/tunnel/cloudflare'

/**
 * GET /api/tv/hls-url (public)
 * Returns resolved HLS URL (DB > tunnel auto > env) + reachability.
 */
export async function GET() {
  try {
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
