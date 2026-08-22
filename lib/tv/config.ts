/**
 * lib/tv/config.ts — Central TV config resolution (DB > tunnel > env).
 *
 * Priority:
 *   1. DB TvSettings.hlsUrl / tunnelAutoUrl (set via /admin/tv/settings)
 *   2. Tunnel auto URL derived from CLOUDFLARE_TUNNEL_TOKEN
 *   3. env.TV_HLS_URL fallback
 */

import { env, getTunnelToken } from '@/lib/env'
import { getTunnelPublicUrl } from '@/lib/tunnel/cloudflare'

export interface TvConfig {
  hlsUrl: string | null
  rtmpUrl: string
  channelName: string
  autoGenerate: boolean
  rssFeeds: string[]
  isConfigured: boolean
  source: 'db' | 'tunnel' | 'env' | 'none'
  tunnelConfigured: boolean
}

export async function getTvConfig(): Promise<TvConfig> {
  const rtmpUrl = env.TV_RTMP_URL || 'rtmp://localhost:1935/live/tv'
  const channelName = env.TV_CHANNEL_NAME || 'Hostamar TV'
  const autoGenerate = env.TV_AUTO_GENERATE_ENABLED === 'true'
  const rssFeeds = (env.RSS_FEEDS || '').split(',').map((s) => s.trim()).filter(Boolean)
  const tunnelUrl = getTunnelPublicUrl()
  const tunnelConfigured = Boolean(getTunnelToken() || tunnelUrl)

  // Try DB first
  try {
    const { prisma } = await import('@/lib/prisma')
    const { ensureSchema } = await import('@/lib/ensure-schema')
    await ensureSchema()
    const settings = await (prisma as any).tvSettings?.findFirst?.()
    if (settings?.hlsUrl) {
      return { hlsUrl: settings.hlsUrl, rtmpUrl: settings.rtmpUrl || rtmpUrl, channelName: settings.channelName || channelName, autoGenerate: settings.autoGenerate ?? autoGenerate, rssFeeds: settings.rssFeeds?.length ? settings.rssFeeds : rssFeeds, isConfigured: true, source: 'db', tunnelConfigured }
    }
    if (settings?.tunnelAutoUrl) {
      return { hlsUrl: settings.tunnelAutoUrl, rtmpUrl: settings.rtmpUrl || rtmpUrl, channelName: settings.channelName || channelName, autoGenerate: settings.autoGenerate ?? autoGenerate, rssFeeds: settings.rssFeeds?.length ? settings.rssFeeds : rssFeeds, isConfigured: true, source: 'tunnel', tunnelConfigured }
    }
  } catch {}

  if (tunnelUrl) return { hlsUrl: tunnelUrl, rtmpUrl, channelName, autoGenerate, rssFeeds, isConfigured: true, source: 'tunnel', tunnelConfigured }
  if (env.TV_HLS_URL) return { hlsUrl: env.TV_HLS_URL, rtmpUrl, channelName, autoGenerate, rssFeeds, isConfigured: true, source: 'env', tunnelConfigured }
  return { hlsUrl: null, rtmpUrl, channelName, autoGenerate, rssFeeds, isConfigured: false, source: 'none', tunnelConfigured }
}

export function getRtmpUrl(): string {
  return env.TV_RTMP_URL || 'rtmp://localhost:1935/live/tv'
}

export function isAgentMode(): boolean {
  // True when TV should be driven by local agent, not Vercel ffmpeg
  return true // Always agent mode: Vercel never runs ffmpeg
}
