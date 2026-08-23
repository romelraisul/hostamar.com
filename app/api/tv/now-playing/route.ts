export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { ensureSchema } from '@/lib/ensure-schema'
import { getOrCreateDefaultChannel } from '@/lib/tv/generator'
import { getStreamStatus } from '@/lib/tv/streamer'
import { computeNowPlaying } from '@/lib/tv/nowPlaying'

/**
 * GET /api/tv/now-playing  (public)
 * Live status + what is on air RIGHT NOW for the homepage TV hero.
 *
 * Rotation-aware: the local ffmpeg loop (tv-ffmpeg.service) plays
 * playlist.host.txt in order with -stream_loop -1. We reconstruct the live
 * position by summing item durations and taking elapsed-since-boot modulo
 * total duration, so "now playing" advances as the loop actually plays.
 * Falls back to lowest-position item / newest generated Video as before.
 */
export async function GET(_req: NextRequest) {
  try {
    const status = await getStreamStatus()

    let np = { title: null as string | null, titleBn: null as string | null, gender: null as string | null, voiceUsed: null as string | null, isViral: false as boolean, viralScore: null as number | null, slug: null as string | null }
    try {
      await ensureSchema()
      const channel = await getOrCreateDefaultChannel()
      np = await computeNowPlaying(channel.id)
    } catch {
      // DB unavailable — still report live status, fields stay null
    }

    return NextResponse.json({
      ok: true,
      isLive: status.isLive,
      hlsReachable: status.hlsReachable,
      hlsUrl: status.hlsUrl,
      channelName: status.channelName,
      title: np.title,
      titleBn: np.titleBn,
      gender: np.gender,
      voiceUsed: np.voiceUsed,
      isViral: (np as any).isViral || false,
      viralScore: (np as any).viralScore ?? null,
      slug: (np as any).slug ?? null,
      isPure: (np as any).isPure ?? false,
      language: (np as any).language ?? null,
      place: (np as any).place ?? null,
      product: (np as any).product ?? null,
      credit: 6000,
    })
  } catch (err) {
    console.error('[tv/now-playing] error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
