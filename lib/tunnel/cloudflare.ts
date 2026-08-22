/**
 * lib/tunnel/cloudflare.ts — Cloudflare Tunnel helpers for TV HLS exposure.
 *
 * On local PC: if CLOUDFLARE_TUNNEL_TOKEN is set, cloudflared exposes http://localhost:8080
 * via https://<tunnel>.cfargotunnel.com — so Vercel /tv can play HLS from your PC.
 *
 * No manual cloudflared needed if token is in env — agent ensures it runs.
 */

import { env, getTunnelToken } from '@/lib/env'

export interface HlsTestResult {
  reachable: boolean
  status: number | null
  error?: string
}

/** Test if an HLS URL is reachable via HEAD request. */
export async function testHlsUrl(url: string): Promise<HlsTestResult> {
  if (!url || !/^https?:\/\//.test(url)) {
    return { reachable: false, status: null, error: 'Invalid URL' }
  }
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(8000) })
    return { reachable: res.ok, status: res.status }
  } catch (e: any) {
    // Fallback: try GET with range header (some HLS servers block HEAD)
    try {
      const res = await fetch(url, {
        headers: { Range: 'bytes=0-0' },
        signal: AbortSignal.timeout(8000),
      })
      return { reachable: res.ok || res.status === 206, status: res.status }
    } catch (e2: any) {
      return { reachable: false, status: null, error: e2?.message?.slice(0, 120) || 'Fetch failed' }
    }
  }
}

/** Auto-generate public HLS URL from tunnel token if present. */
export function getTunnelPublicUrl(): string | null {
  const token = getTunnelToken()
  if (!token) return null
  // Tunnel token is often a JWT-like string; try to extract tunnel name
  // Fallback: if TUNNEL_ID env exists, use it
  const tunnelId = env.TUNNEL_ID || env.CLOUDFLARE_ZONE_ID
  if (tunnelId && /^[a-f0-9-]{36}$/.test(tunnelId)) {
    return `https://${tunnelId}.cfargotunnel.com/hls/live/tv/index.m3u8`
  }
  // Try decoding token as base64 JSON (cloudflared token format)
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString())
    if (decoded.t) return `https://${decoded.t}.cfargotunnel.com/hls/live/tv/index.m3u8`
  } catch {}
  // Token itself may be the tunnel id in some setups
  if (/^[a-f0-9-]{36}$/.test(token)) {
    return `https://${token}.cfargotunnel.com/hls/live/tv/index.m3u8`
  }
  return null
}

/** Resolve the effective HLS URL: DB TvSettings > tunnel auto URL > env TV_HLS_URL. */
export async function resolveHlsUrl(): Promise<{ hlsUrl: string | null; source: 'db' | 'tunnel' | 'env' | 'none'; isConfigured: boolean }> {
  // Try DB first (prisma may not be available in all contexts)
  try {
    const { prisma } = await import('@/lib/prisma')
    const { ensureSchema } = await import('@/lib/ensure-schema')
    await ensureSchema()
    const settings = await (prisma as any).tvSettings.findFirst?.()
    if (settings?.hlsUrl) return { hlsUrl: settings.hlsUrl, source: 'db', isConfigured: true }
    if (settings?.tunnelAutoUrl) return { hlsUrl: settings.tunnelAutoUrl, source: 'tunnel', isConfigured: true }
  } catch {}
  const tunnelUrl = getTunnelPublicUrl()
  if (tunnelUrl) return { hlsUrl: tunnelUrl, source: 'tunnel', isConfigured: true }
  if (env.TV_HLS_URL) return { hlsUrl: env.TV_HLS_URL, source: 'env', isConfigured: true }
  return { hlsUrl: null, source: 'none', isConfigured: false }
}

/** Create tunnel via Cloudflare API if token missing (requires API token + zone). */
export async function createTunnelIfNeeded(): Promise<{ created: boolean; tunnelId?: string; error?: string }> {
  if (getTunnelToken()) return { created: false, error: 'Tunnel token already exists' }
  const apiToken = env.CLOUDFLARE_API_TOKEN || env.CF_API_TOKEN
  const zoneId = env.CLOUDFLARE_ZONE_ID
  if (!apiToken || !zoneId) return { created: false, error: 'CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID required' }
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${zoneId}/cfd_tunnel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'hostamar-tv', config_src: 'cloudflare' }),
    })
    const data = await res.json()
    if (data.success && data.result?.id) return { created: true, tunnelId: data.result.id }
    return { created: false, error: data.errors?.[0]?.message || 'Create failed' }
  } catch (e: any) {
    return { created: false, error: e.message }
  }
}
