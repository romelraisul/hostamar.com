/**
 * lib/tv/streamer.ts — 24/7 AI TV Station RTMP streamer.
 *
 * Builds and manages the FFmpeg command that loops the channel playlist and
 * pushes it to one or more RTMP destinations (YouTube / Facebook / Twitch / custom).
 *
 * On Vercel (serverless) FFmpeg cannot run long-lived — the actual streaming is
 * performed by the tv-station Docker container (docker/tv-station). This module:
 *   - builds the exact ffmpeg command (single source of truth)
 *   - manages DB state (isLive, destinations)
 *   - exposes status for the dashboard + /tv public page
 *
 * No mocks: if no destinations are configured, start returns an honest error.
 */
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'
import { ensureSchema } from '@/lib/ensure-schema'

export interface StreamDestination {
  id: string
  platform: string
  rtmpUrl: string
  streamKey: string
  label: string | null
  isActive: boolean
}

/** Build the full RTMP URL for a destination (rtmpUrl + streamKey). */
export function buildRtmpTarget(d: StreamDestination): string {
  const base = d.rtmpUrl.replace(/\/+$/, '')
  // YouTube: rtmp://a.rtmp.youtube.com/live2/KEY
  // Facebook: rtmps://live-api-s.facebook.com:443/rtmp/KEY
  if (base.endsWith('/live2') || base.endsWith('/rtmp') || base.endsWith('/app')) {
    return `${base}/${d.streamKey}`
  }
  return `${base}/${d.streamKey}`
}

/**
 * Build the ffmpeg command that streams the playlist to all active destinations.
 * Uses -stream_loop -1 for infinite looping and tee-style multiple -f flv outputs.
 */
export function buildFfmpegCommand(playlistFile: string, destinations: StreamDestination[]): string[] {
  const args: string[] = [
    'ffmpeg',
    '-re', // read at native frame rate (real-time)
    '-stream_loop', '-1', // loop playlist forever
    '-i', playlistFile,
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-b:v', '2500k',
    '-maxrate', '2500k',
    '-bufsize', '5000k',
    '-pix_fmt', 'yuv420p',
    '-g', '50',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '44100',
  ]
  for (const d of destinations) {
    args.push('-f', 'flv', buildRtmpTarget(d))
  }
  return args
}

/** Get active destinations for a channel from the DB. */
export async function getActiveDestinations(channelId: string): Promise<StreamDestination[]> {
  await ensureSchema()
  const rows = await prisma.tvStreamDestination.findMany({
    where: { channelId, isActive: true },
  })
  return rows.map((r) => ({
    id: r.id,
    platform: r.platform,
    rtmpUrl: r.rtmpUrl,
    streamKey: r.streamKey,
    label: r.label,
    isActive: r.isActive,
  }))
}

/** Seed destinations from env vars (YOUTUBE/FACEBOOK/TWITCH) if DB is empty. */
export async function seedDestinationsFromEnv(channelId: string): Promise<number> {
  await ensureSchema()
  const existing = await prisma.tvStreamDestination.count({ where: { channelId } })
  if (existing > 0) return 0

  const seeds: { platform: string; rtmpUrl: string | undefined; streamKey: string | undefined }[] = [
    { platform: 'YOUTUBE', rtmpUrl: env.YOUTUBE_RTMP_URL, streamKey: env.YOUTUBE_STREAM_KEY },
    { platform: 'FACEBOOK', rtmpUrl: env.FACEBOOK_RTMP_URL, streamKey: env.FACEBOOK_STREAM_KEY },
    { platform: 'TWITCH', rtmpUrl: env.TWITCH_RTMP_URL, streamKey: env.TWITCH_STREAM_KEY },
  ]

  let created = 0
  for (const s of seeds) {
    if (s.rtmpUrl && s.streamKey) {
      await prisma.tvStreamDestination.create({
        data: {
          channelId,
          platform: s.platform,
          rtmpUrl: s.rtmpUrl,
          streamKey: s.streamKey,
          label: `${s.platform} (from env)`,
          isActive: true,
        },
      })
      created++
    }
  }
  return created
}

export interface StreamStatus {
  isLive: boolean
  liveSince: string | null
  channelName: string
  playlistLength: number
  tvPlaylistCount: number
  videoCount: number
  destinations: { platform: string; label: string | null; isActive: boolean; lastError: string | null }[]
  autoGenerateEnabled: boolean
  hlsUrl: string | null
  rtmpUrl: string
  mode: 'local_pc'
  tunnelConfigured: boolean
  hlsReachable: boolean
  agentLastSeen: string | null
  // Facebook LIVE override (set by admin or PC cron)
  platform?: 'FACEBOOK' | 'YOUTUBE'
  videoId?: string
  title?: string
  iptvChannels?: number
}

/** Aggregate live status for the dashboard + /tv. */
export async function getStreamStatus(): Promise<StreamStatus> {
  await ensureSchema()
  const { getTvConfig } = await import('@/lib/tv/config')
  const { testHlsUrl } = await import('@/lib/tunnel/cloudflare')
  const tvConfig = await getTvConfig()
  let hlsReachable = false
  if (tvConfig.hlsUrl) {
    try {
      const r = await testHlsUrl(tvConfig.hlsUrl)
      hlsReachable = r.reachable
    } catch {}
  }
  // Agent last seen: latest TvCommand executedAt or latest TvLog
  let agentLastSeen: string | null = null
  try {
    const lastCmd = await (prisma as any).tvCommand?.findFirst?.({ orderBy: { createdAt: 'desc' } })
    if (lastCmd?.executedAt) agentLastSeen = lastCmd.executedAt.toISOString()
    else if (lastCmd?.createdAt) agentLastSeen = lastCmd.createdAt.toISOString()
  } catch {}
  // isLive = hlsReachable if hlsUrl present, otherwise fall back to DB TvChannel.isLive
  const channel = await prisma.tvChannel.findFirst({ orderBy: { createdAt: 'asc' } })
  if (!channel) {
    return {
      isLive: hlsReachable,
      liveSince: null,
      channelName: tvConfig.channelName,
      playlistLength: 0,
      tvPlaylistCount: 0,
      videoCount: 0,
      destinations: [],
      autoGenerateEnabled: tvConfig.autoGenerate,
      hlsUrl: tvConfig.hlsUrl,
      rtmpUrl: tvConfig.rtmpUrl,
      mode: 'local_pc',
      tunnelConfigured: tvConfig.tunnelConfigured,
      hlsReachable,
      agentLastSeen,
    }
  }

  const destinations = await prisma.tvStreamDestination.findMany({ where: { channelId: channel.id } })

  // Prefer HLS probe when hlsUrl exists; otherwise use DB flag (manual start)
  const isLive = tvConfig.hlsUrl ? hlsReachable : channel.isLive

  // Playlist count aligned with /api/tv/playlist: TvPlaylistItem if non-empty,
  // else fall back to the Video table (same fallback the playlist API uses).
  let tvPlaylistCount = 0
  let videoCount = 0
  try {
    tvPlaylistCount = await prisma.tvPlaylistItem.count({ where: { channelId: channel.id } })
    if (tvPlaylistCount === 0) {
      videoCount = await (prisma as any).video?.count?.() || 0
    }
  } catch {}
  const playlistLength = tvPlaylistCount > 0 ? tvPlaylistCount : videoCount

  return {
    isLive,
    liveSince: channel.liveSince?.toISOString() || null,
    channelName: channel.name,
    playlistLength,
    tvPlaylistCount,
    videoCount,
    destinations: destinations.map((d) => ({
      platform: d.platform,
      label: d.label,
      isActive: d.isActive,
      lastError: d.lastError,
    })),
    autoGenerateEnabled: tvConfig.autoGenerate,
    hlsUrl: tvConfig.hlsUrl,
    rtmpUrl: tvConfig.rtmpUrl,
    mode: 'local_pc',
    tunnelConfigured: tvConfig.tunnelConfigured,
    hlsReachable,
    agentLastSeen,
  }
}

/** Guard: Vercel can never run ffmpeg long-lived. */
export function canRunFfmpeg(): { ok: boolean; reason?: string } {
  if (process.env.VERCEL) return { ok: false, reason: 'Must run on local PC (Vercel is serverless)' }
  return { ok: true }
}

/** Mark channel live/off in the DB. */
export async function setLiveState(channelId: string, isLive: boolean): Promise<void> {
  await ensureSchema()
  await prisma.tvChannel.update({
    where: { id: channelId },
    data: { isLive, liveSince: isLive ? new Date() : null },
  })
}
