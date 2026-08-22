export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getStreamStatus } from '@/lib/tv/streamer'

/**
 * GET /api/tv/status  (public)
 * Returns live status for the dashboard + /tv public page.
 */
export async function GET() {
  try {
    const status = await getStreamStatus()
    return NextResponse.json({ ok: true, ...status })
  } catch (err) {
    console.error('[tv/status] error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
