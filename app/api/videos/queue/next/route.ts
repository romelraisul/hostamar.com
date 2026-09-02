export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * GET /api/videos/queue/next?secret=... — V30.
 *
 * Local HunyuanVideo worker pull endpoint. Returns the OLDEST pending
 * VideoQueue row (FIFO) and atomically claims it (pending → processing with
 * a stale-claim guard: rows already `processing` but older than 20 minutes
 * are reclaimable — the worker machine is not always on, so crashed claims
 * must not strand a customer's video forever).
 *
 * Worker contract:
 *   GET  /api/videos/queue/next?secret=WORKER_SECRET
 *        → { ok, queueId, videoId, topic, title, prompt, language }
 *        → { ok: true, empty: true } when nothing pending
 *   POST /api/videos/upload/complete {videoId, b2Key, secret, ...}
 *
 * Auth: COMFYUI_WORKER_SECRET (header x-worker-secret or ?secret=).
 * FAIL CLOSED — no env secret configured → 401 always (no literal fallbacks;
 * V18 auth-bypass rule). Middleware passes this path through (self-guarded
 * list) because the worker cannot carry a dashboard session cookie.
 */
const CLAIM_STALE_MIN = 20

export async function GET(req: NextRequest) {
  try {
    // Works on NextRequest (nextUrl) AND plain Request (URL) — unit tests
    // construct bare Requests; a nextUrl access would throw → false 500.
    const url = new URL(req.url)
    const secret =
      req.headers.get('x-worker-secret') ||
      url.searchParams.get('secret') ||
      ''
    const expected = process.env.COMFYUI_WORKER_SECRET || ''
    // Fail closed: empty expected = feature not configured; empty provided = no auth.
    if (!expected || !secret || secret !== expected) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHENTICATED' }, { status: 401 })
    }

    // FIFO: oldest pending first; also allow reclaiming stale processing rows.
    // VideoQueue has NO updatedAt — processedAt doubles as the claim timestamp.
    const staleBefore = new Date(Date.now() - CLAIM_STALE_MIN * 60_000)
    const candidate = await prisma.videoQueue.findFirst({
      where: {
        OR: [
          { status: 'pending' },
          { status: 'processing', processedAt: { lt: staleBefore } },
        ],
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, videoId: true, topic: true, status: true, attempts: true },
    })
    if (!candidate) {
      return NextResponse.json({ ok: true, empty: true })
    }

    // Claim atomically-ish: conditional update — only wins if still pending
    // (or still stale-processing), so two workers can't take the same row.
    const claimed = await prisma.videoQueue.updateMany({
      where: {
        id: candidate.id,
        OR: [
          { status: 'pending' },
          { status: 'processing', processedAt: { lt: staleBefore } },
        ],
      },
      data: { status: 'processing', attempts: { increment: 1 }, processedAt: new Date() },
    })
    if (claimed.count === 0) {
      // Lost the race — tell the worker the queue is momentarily busy; it polls again.
      return NextResponse.json({ ok: true, empty: true, raced: true })
    }

    // Mark the customer-facing Video row as processing (dashboard pulse).
    if (candidate.videoId) {
      await prisma.video
        .update({
          where: { id: candidate.videoId },
          data: { status: 'processing', updatedAt: new Date() },
        })
        .catch(() => null)
    }

    // Full generation prompt: title + prompt/topic + description (the dashboard
    // sends title+description; the VideoQueue row's topic carries the core brief).
    let prompt = candidate.topic || ''
    let title = ''
    let language = 'bn'
    let description: string | null = null
    if (candidate.videoId) {
      const v = await prisma.video
        .findUnique({ where: { id: candidate.videoId }, select: { title: true, description: true, language: true, prompt: true } })
        .catch(() => null)
      if (v) {
        title = v.title || ''
        description = v.description || null
        language = v.language || 'bn'
        prompt = [v.title, v.prompt || candidate.topic, v.description || '']
          .filter(Boolean)
          .join('\n')
      }
    }

    return NextResponse.json({
      ok: true,
      queueId: candidate.id,
      videoId: candidate.videoId,
      topic: candidate.topic,
      title,
      description,
      language,
      prompt,
      engine: 'hunyuanvideo-1.5-8b-fp8-comfyui-local',
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Internal server error', detail: String(e?.message || e).slice(0, 160) },
      { status: 500 },
    )
  }
}
