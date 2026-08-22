export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureSchema } from '@/lib/ensure-schema'
import { setLiveState } from '@/lib/tv/streamer'

/**
 * POST /api/tv/stream/stop  (admin)
 * Marks the channel offline. The tv-station container watches this state and
 * terminates its FFmpeg process.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)
    await ensureSchema()

    const channel = await prisma.tvChannel.findFirst({ orderBy: { createdAt: 'asc' } })
    if (!channel) {
      return NextResponse.json({ error: 'NO_CHANNEL', message: 'No TV channel exists yet.' }, { status: 404 })
    }

    await setLiveState(channel.id, false)

    return NextResponse.json({ ok: true, isLive: false, message: 'Stream stopped.' })
  } catch (err: any) {
    const status = err?.cause?.status || 500
    if (status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('[tv/stream/stop] error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
