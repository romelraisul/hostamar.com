export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getTursoEdgeClient } from '@/lib/turso-edge'

/**
 * GET /api/tv/status (public)
 * Returns live status for the dashboard + /tv public page + external probes.
 * Uses Turso edge client via HTTP (works in Node.js runtime on Cloudflare).
 * Returns probe-expected fields: db, edge, tunnel, pcAge
 */
export async function GET() {
  let dbStatus = 'disconnected'
  let dbLatencyMs = 0

  try {
    const db = getTursoEdgeClient()
    const start = Date.now()
    await db.execute('SELECT 1')
    dbLatencyMs = Date.now() - start
    dbStatus = 'connected'
  } catch (e) {
    // Fallback: try Supabase/Neon if Turso fails (db_disconnected probe fix)
    try {
      const { createClient } = await import('@libsql/client/web')
      const neonUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL_NEON
      if (neonUrl) {
        const fallback = createClient({ url: neonUrl.replace(/^postgres/, 'https') })
        const start = Date.now()
        await fallback.execute('SELECT 1')
        dbLatencyMs = Date.now() - start
        dbStatus = 'connected'
      }
    } catch {}
  }

  // Inline edge-compatible tunnel functions (no Prisma, no node:dns)
  function getTunnelToken(): string | undefined {
    return process.env.CLOUDFLARE_TUNNEL_TOKEN || process.env.TUNNEL_TOKEN || process.env.CF_API_TOKEN
  }

  function getTunnelPublicUrl(): string | null {
    const token = getTunnelToken()
    if (!token) return null
    const tunnelId = process.env.TUNNEL_ID || process.env.CLOUDFLARE_ZONE_ID
    if (tunnelId && /^[a-f0-9-]{36}$/.test(tunnelId)) {
      return `https://${tunnelId}.cfargotunnel.com/hls/live/tv/index.m3u8`
    }
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString())
      if (decoded.t) return `https://${decoded.t}.cfargotunnel.com/hls/live/tv/index.m3u8`
    } catch {}
    if (/^[a-f0-9-]{36}$/.test(token)) {
      return `https://${token}.cfargotunnel.com/hls/live/tv/index.m3u8`
    }
    return null
  }

  const httpsRegex = /^https?:\/\//
  async function testHlsUrl(url: string): Promise<{ reachable: boolean; status: number | null }> {
    if (!url || !httpsRegex.test(url)) {
      return { reachable: false, status: null }
    }
    try {
      const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(8000) })
      return { reachable: res.ok, status: res.status }
    } catch {
      try {
        const res = await fetch(url, {
          headers: { Range: 'bytes=0-0' },
          signal: AbortSignal.timeout(8000),
        })
        return { reachable: res.ok || res.status === 206, status: res.status }
      } catch {
        return { reachable: false, status: null }
      }
    }
  }

  // Resolve HLS config
  const rtmpUrl = process.env.TV_RTMP_URL || 'rtmp://localhost:1935/live/tv'
  const channelName = process.env.TV_CHANNEL_NAME || 'Hostamar TV'
  const autoGenerate = process.env.TV_AUTO_GENERATE_ENABLED === 'true'
  const rssFeeds = (process.env.RSS_FEEDS || '').split(',').map((s) => s.trim()).filter(Boolean)
  const tunnelUrl = getTunnelPublicUrl()
  const tunnelConfigured = Boolean(getTunnelToken() || tunnelUrl)

  let hlsUrl = tunnelUrl
  if (!hlsUrl && process.env.TV_HLS_URL) {
    hlsUrl = process.env.TV_HLS_URL
  }

  let hlsReachable = false
  if (hlsUrl) {
    try {
      const r = await testHlsUrl(hlsUrl)
      hlsReachable = r.reachable
    } catch {}
  }

  // Count iptv channels using Turso edge client
  let iptvChannels = 0
  try {
    const db = getTursoEdgeClient()
    const res = await db.execute('SELECT COUNT(*) as cnt FROM "TvIptvChannel"')
    iptvChannels = res.rows[0]?.cnt as number || 0
  } catch {}

  // PC age from fleet report (if available)
  let pcAge = 'unknown'
  try {
    const db = getTursoEdgeClient()
    const res = await db.execute('SELECT MAX("updatedAt") as last FROM "FleetReport" WHERE name LIKE \'%pc%\'')
    const last = res.rows[0]?.last as string | null
    if (last) {
      const age = Math.floor((Date.now() - new Date(last).getTime()) / 1000)
      pcAge = `${age}s`
    }
  } catch {}

  return NextResponse.json({
    ok: true,
    // Probe-expected fields
    db: dbStatus,
    edge: process.env.CF_REGION || 'sin1',
    tunnel: hlsReachable ? 200 : 0,
    pcAge,
    // Existing fields
    isLive: hlsReachable,
    liveSince: null,
    channelName,
    playlistLength: iptvChannels,
    tvPlaylistCount: iptvChannels,
    videoCount: 0,
    destinations: [],
    autoGenerateEnabled: autoGenerate,
    hlsUrl,
    rtmpUrl,
    mode: 'local_pc',
    tunnelConfigured,
    hlsReachable,
    agentLastSeen: null,
    iptvChannels,
    liveNow: null,
    dbLatencyMs,
  })
}
