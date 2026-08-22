export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getOrCreateDefaultChannel, getPlaylistLength } from '@/lib/tv/generator'
import {
  getActiveDestinations,
  seedDestinationsFromEnv,
  buildFfmpegCommand,
  setLiveState,
} from '@/lib/tv/streamer'

/**
 * POST /api/tv/stream/start  (admin)
 * Creates a TvCommand for the local agent to execute. Legacy direct mode also
 * supported: marks live and returns ffmpeg command. On Vercel we cannot spawn
 * FFmpeg — guidance is returned instead.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)

    const body = await req.json().catch(() => ({}))
    const mode = body.mode || body.action || 'START_WEBSITE' // START_WEBSITE | START_ALL

    const channel = await getOrCreateDefaultChannel()

    // Seed destinations from env if none configured yet
    await seedDestinationsFromEnv(channel.id)

    const destinations = await getActiveDestinations(channel.id)
    const playlistLength = await getPlaylistLength(channel.id)
    if (playlistLength === 0) {
      return NextResponse.json(
        { error: 'EMPTY_PLAYLIST', message: 'Playlist is empty. Generate videos first (POST /api/tv/generate-loop).' },
        { status: 400 }
      )
    }

    // For START_WEBSITE we don't require YT/FB destinations — local RTMP is enough
    if (mode === 'START_ALL' && !destinations.length) {
      return NextResponse.json(
        {
          error: 'NO_DESTINATIONS',
          message:
            'No active stream destinations. Add RTMP destinations (YouTube/Facebook/Twitch keys) via /api/tv/destinations or env vars.',
        },
        { status: 503 }
      )
    }

    // Create agent command for local PC
    try {
      const { prisma } = await import('@/lib/prisma')
      const { ensureSchema } = await import('@/lib/ensure-schema')
      await ensureSchema()
      const cmd = await (prisma as any).tvCommand.create({
        data: { action: mode === 'START_ALL' ? 'START_ALL' : 'START_WEBSITE', payload: { destinations: destinations.map((d) => d.platform) }, status: 'PENDING' },
      })
      await (prisma as any).tvLog.create({ data: { level: 'info', message: `Command ${cmd.action} queued (${cmd.id})` } }).catch(() => {})
    } catch {}

    await setLiveState(channel.id, true)

    // The playlist file is built by the tv-station container from the DB.
    const effectiveDests = mode === 'START_WEBSITE' ? [] : destinations
    const ffmpegCommand =
      effectiveDests.length > 0 ? buildFfmpegCommand('/tv/playlist.m3u8', effectiveDests) : ['ffmpeg', '-re', '-stream_loop', '-1', '-f', 'concat', '-safe', '0', '-i', '/tv/playlist.txt', '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '2500k', '-c:a', 'aac', '-f', 'flv', 'rtmp://localhost:1935/live/tv']

    return NextResponse.json({
      ok: true,
      isLive: true,
      channelId: channel.id,
      channelName: channel.name,
      playlistLength,
      destinations: destinations.map((d) => d.platform),
      mode,
      commandQueued: true,
      ffmpegCommand: ffmpegCommand.join(' '),
      note:
        mode === 'START_WEBSITE'
          ? 'Website-only stream queued. Agent on local PC will start ffmpeg to rtmp://localhost:1935/live/tv'
          : 'Multi-destination stream queued. Agent will fan-out to website + all active destinations.',
    })
  } catch (err: any) {
    const status = err?.cause?.status || 500
    if (status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('[tv/stream/start] error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
