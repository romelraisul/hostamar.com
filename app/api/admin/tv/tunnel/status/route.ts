export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getTunnelPublicUrl, testHlsUrl } from '@/lib/tunnel/cloudflare'
import { getTvConfig } from '@/lib/tv/config'
import { env, getTunnelToken } from '@/lib/env'

/**
 * GET /api/admin/tv/tunnel/status (admin)
 * Returns tunnel config + auto URL + HLS reachability
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const cfg = await getTvConfig()
    const tunnelUrl = getTunnelPublicUrl()
    const tokenPresent = Boolean(getTunnelToken())
    const apiTokenPresent = Boolean(env.CLOUDFLARE_API_TOKEN || env.CF_API_TOKEN)
    let reachable = false
    let hlsStatus: number | null = null
    if (cfg.hlsUrl) {
      const r = await testHlsUrl(cfg.hlsUrl)
      reachable = r.reachable
      hlsStatus = r.status
    }
    return NextResponse.json({
      ok: true,
      tunnelConfigured: cfg.tunnelConfigured,
      tokenPresent,
      apiTokenPresent,
      tunnelUrl,
      hlsUrl: cfg.hlsUrl,
      source: cfg.source,
      reachable,
      hlsStatus,
      rtmpUrl: cfg.rtmpUrl,
    })
  } catch (err: any) {
    const status = err?.cause?.status || 500
    if (status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
