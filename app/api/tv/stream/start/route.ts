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
 * Marks the channel live and returns the ffmpeg command the tv-station
 * container should run. On Vercel we cannot spawn long-lived FFmpeg, so the
 * Docker container (docker/tv-station) executes the returned command.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)

    const channel = await getOrCreateDefaultChannel()

    // Seed destinations from env if none configured yet
    await seedDestinationsFromEnv(channel.id)

    const destinations = await getActiveDestinations(channel.id)
    if (!destinations.length) {
      return NextResponse.json(
        {
          error: 'NO_DESTINATIONS',
          message:
            'No active stream destinations. Add RTMP destinations (YouTube/Facebook/Twitch keys) via /api/tv/destinations or env vars.',
        },
        { status: 503 }
      )
    }

    const playlistLength = await getPlaylistLength(channel.id)
    if (playlistLength === 0) {
      return NextResponse.json(
        { error: 'EMPTY_PLAYLIST', message: 'Playlist is empty. Generate videos first (POST /api/tv/generate-loop).' },
        { status: 400 }
      )
    }

    await setLiveState(channel.id, true)

    // The playlist file is built by the tv-station container from the DB.
    const ffmpegCommand = buildFfmpegCommand('/tv/playlist.m3u8', destinations)

    return NextResponse.json({
      ok: true,
      isLive: true,
      channelId: channel.id,
      channelName: channel.name,
      playlistLength,
      destinations: destinations.map((d) => d.platform),
      ffmpegCommand: ffmpegCommand.join(' '),
      note: 'Execute this command in the tv-station Docker container (docker/tv-station). Vercel cannot run long-lived FFmpeg.',
    })
  } catch (err: any) {
    const status = err?.cause?.status || 500
    if (status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('[tv/stream/start] error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
