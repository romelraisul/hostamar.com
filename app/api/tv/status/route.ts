export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getStreamStatus } from '@/lib/tv/streamer'

/**
 * GET /api/tv/status (public)
 * Returns live status for the dashboard + /tv public page.
 * Merges HLS stream status + Facebook LIVE (from data/live.json set by admin or PC cron).
 */
export async function GET() {
  try {
    const status = await getStreamStatus()

    // Check for Facebook LIVE override (set by /api/admin/tv-analytics or PC cron)
    try {
      const fs = await import('fs')
      const live = JSON.parse(fs.readFileSync('data/live.json', 'utf-8'))
      if (live?.isLive && live.platform === 'FACEBOOK') {
        status.isLive = true
        status.platform = 'FACEBOOK'
        status.videoId = live.videoId
        status.title = live.title
      }
    } catch {}

    return NextResponse.json({ ok: true, ...status })
  } catch (err) {
    console.error('[tv/status] error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
