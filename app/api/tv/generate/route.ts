export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { generateTvVideo } from '@/lib/tv/generator'

/**
 * POST /api/tv/generate  (admin)
 * Manually generate one AI video from a trending topic and add to playlist.
 * Body (optional): { topic?: string, style?: string }
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)

    const body = await req.json().catch(() => ({}))
    const result = await generateTvVideo({
      topic: body.topic ? String(body.topic) : undefined,
      style: body.style ? String(body.style) : undefined,
    })

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 502 })
    }

    return NextResponse.json({
      ok: true,
      videoId: result.videoId,
      playlistItemId: result.playlistItemId,
      topic: result.topic,
      message: 'Video generation enqueued. It will appear in the playlist when rendering completes.',
    })
  } catch (err: any) {
    const status = err?.cause?.status || 500
    if (status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('[tv/generate] error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
