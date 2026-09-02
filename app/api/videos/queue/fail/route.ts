export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * POST /api/videos/queue/fail — V30.
 *
 * Local HunyuanVideo worker failure callback. Transitions the claimed row
 * honestly: VideoQueue → failed (renderError), Video → failed, so the row
 * NEVER strands (V28 lesson: always transition). The customer can retry via
 * the dashboard retry button (serverless pipeline fallback) or re-queue
 * when the worker machine is back on.
 *
 * Auth: COMFYUI_WORKER_SECRET — fail closed.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const secret = String(body.secret || '')
    const expected = process.env.COMFYUI_WORKER_SECRET || ''
    if (!expected || !secret || secret !== expected) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHENTICATED' }, { status: 401 })
    }
    const videoId = String(body.videoId || '')
    const queueId = String(body.queueId || '')
    const error = String(body.error || 'worker render failed').slice(0, 500)
    if (!videoId && !queueId) {
      return NextResponse.json({ error: 'videoId or queueId required', code: 400 }, { status: 400 })
    }

    if (queueId) {
      await prisma.videoQueue
        .update({
          where: { id: queueId },
          data: { status: 'failed', renderStatus: 'error', renderError: error, processedAt: new Date() },
        })
        .catch(() => null)
    } else {
      await prisma.videoQueue
        .updateMany({
          where: { videoId, status: { in: ['pending', 'processing'] } },
          data: { status: 'failed', renderStatus: 'error', renderError: error, processedAt: new Date() },
        })
        .catch(() => null)
    }

    if (videoId) {
      await prisma.video
        .update({ where: { id: videoId }, data: { status: 'failed', updatedAt: new Date() } })
        .catch(() => null)
    }

    return NextResponse.json({ ok: true, videoId, queueId, status: 'failed', error })
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Internal server error', detail: String(e?.message || e).slice(0, 160) },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/videos/queue/fail',
    usage: 'POST {videoId, queueId?, error, secret} — worker honest-failure callback',
    auth: 'COMFYUI_WORKER_SECRET required (fail closed)',
  })
}
