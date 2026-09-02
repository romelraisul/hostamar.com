export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 55

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'
import prisma from '@/lib/prisma'
import { processVideoNow, healStuckVideos } from '@/lib/video-pipeline'

/**
 * POST /api/videos/retry — V28.
 *
 * Body: {videoId?: string, taskId?: string, heal?: boolean}
 *
 * - With videoId: re-run the serverless pipeline for the caller's OWN video
 *   (processing/failed/completed) — transitions to completed/failed always.
 * - With heal:true (no id): sweep the caller's videos stuck in processing
 *   (>5min) and heal them — this is the auto-repair path for rows stranded by
 *   the legacy queue design (pre-V28 creates never transitioned).
 *
 * Auth: cookie/Bearer via getAuthUser (dashboard). Honest 401 without.
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHENTICATED' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { videoId, taskId, heal } = body as { videoId?: string; taskId?: string; heal?: boolean }

    // Heal sweep — caller's stuck rows only (IDOR-safe: scoped by customerId).
    if (heal && !videoId && !taskId) {
      const cutoff = new Date(Date.now() - 5 * 60_000)
      const stuck = await prisma.video.findMany({
        where: { customerId: authUser.id, status: 'processing', updatedAt: { lt: cutoff } },
        take: 5,
      }).catch(() => [])
      let healed = 0
      for (const v of stuck) {
        await processVideoNow(v.id, v.topic || v.title || 'Hostamar video')
        healed++
      }
      return NextResponse.json({ ok: true, healed, stuckFound: stuck.length })
    }

    const id = videoId || taskId
    if (!id) {
      return NextResponse.json({ error: 'videoId or heal:true required', code: 400 }, { status: 400 })
    }

    // Own row only — never another customer's (IDOR fix pattern).
    const video = await prisma.video.findFirst({
      where: { id, customerId: authUser.id },
      select: { id: true, topic: true, title: true, status: true },
    })
    if (!video) {
      return NextResponse.json({ error: 'Video not found for this account', code: 404 }, { status: 404 })
    }

    // Re-run the pipeline (bounded single-pass; transitions always).
    // V30: when the local Hunyuan worker mode is ON, retry RE-QUEUES the row
    // for the 8B motion render instead of running the gradient fallback. When
    // the worker is offline (no COMFYUI_WORKER_SECRET), fall back to the
    // serverless pipeline so the row always transitions.
    if (process.env.COMFYUI_WORKER_SECRET) {
      await prisma.videoQueue
        .updateMany({
          where: { videoId: video.id, status: { in: ['pending', 'processing', 'failed', 'completed'] } },
          data: { status: 'pending', renderStatus: null, renderError: null, attempts: 0, processedAt: null },
        })
        .catch(() => null)
      await prisma.video
        .update({ where: { id: video.id }, data: { status: 'processing', url: '', updatedAt: new Date() } })
        .catch(() => null)
      return NextResponse.json({
        ok: true,
        videoId: video.id,
        status: 'processing',
        note: 're-queued for local HunyuanVideo 1.5 8B worker — real motion render (PC on = ~2-4 min/clip)',
      })
    }
    const result = await processVideoNow(video.id, video.topic || video.title || 'Hostamar video')
    return NextResponse.json({
      ok: result.ok,
      videoId: video.id,
      status: result.status,
      videoUrl: result.url || undefined,
      error: result.error || undefined,
      note: result.ok ? 'completed (real or honest gradient slides) — dashboard player renders + exports WEBM client-side' : 'failed — status transitioned, retry again if transient',
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal server error', detail: String(e?.message || e).slice(0, 160) }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/videos/retry',
    usage: 'POST {videoId} — rerun pipeline for own video | POST {heal:true} — sweep own stuck processing rows',
    auth: 'dashboard cookie/Bearer required',
  })
}
