export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/env'
import {
  generateTvVideo,
  getOrCreateDefaultChannel,
  getPlaylistLength,
} from '@/lib/tv/generator'

const MIN_PLAYLIST_LENGTH = 10

/**
 * POST /api/tv/generate-loop
 * Cron endpoint (every 30 min, protected by CRON_SECRET).
 * If the playlist has fewer than MIN_PLAYLIST_LENGTH items, generate 1 new
 * AI video from a trending RSS topic.
 */
export async function POST(req: NextRequest) {
  try {
    // Auth: CRON_SECRET (Vercel cron sends Authorization: Bearer <secret>)
    const secret = env.CRON_SECRET
    if (!secret) {
      return NextResponse.json(
        { error: 'CRON_NOT_CONFIGURED', message: 'Set CRON_SECRET to enable the TV generate loop.' },
        { status: 503 }
      )
    }
    const provided =
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
      req.headers.get('x-cron-secret')
    if (provided !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (env.TV_AUTO_GENERATE_ENABLED !== 'true') {
      return NextResponse.json({ ok: true, skipped: true, reason: 'TV_AUTO_GENERATE_ENABLED is not true' })
    }

    const channel = await getOrCreateDefaultChannel()
    const length = await getPlaylistLength(channel.id)

    if (length >= MIN_PLAYLIST_LENGTH) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: `playlist already has ${length} items (>= ${MIN_PLAYLIST_LENGTH})`,
        playlistLength: length,
      })
    }

    const result = await generateTvVideo()
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 502 })
    }

    return NextResponse.json({
      ok: true,
      generated: true,
      videoId: result.videoId,
      topic: result.topic,
      playlistLength: length + 1,
    })
  } catch (err) {
    console.error('[tv/generate-loop] error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
