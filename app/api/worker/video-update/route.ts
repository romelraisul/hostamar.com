// Internal callback endpoint for the Python GPU worker to report job progress
// and results. NOT user-facing — protected by a shared secret in the header.
//
// POST /api/worker/video-update
// Headers: x-worker-secret: <WORKER_SHARED_SECRET>
// Body: { videoId, jobId, status, videoUrl?, thumbnailUrl?, duration?, error?, provider? }

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Whitelist of columns guaranteed to exist on the Video table. We discovered
// the DB schema is materially different from prisma/schema.prisma (e.g. no
// `prompt`, `error`, `progress`, `provider`, `completedAt`, `videoUrl` cols).
// Rather than migrating, we constrain the callback to this safe subset.
// To extend: ALTER TABLE "Video" ADD COLUMN ... then add the name here.
const VIDEO_UPDATE_WHITELIST = new Set([
  'status',
  'url',           // worker reports 'url' from generate_via_huggingface
  'videoUrl',      // worker reports 'videoUrl' from generate_via_replicate/fal
  'thumbnailUrl',
  'duration',
])

export async function POST(request: Request) {
  // ---- auth --------------------------------------------------------------
  const expected = process.env.WORKER_SHARED_SECRET
  if (!expected) {
    return NextResponse.json(
      { error: 'worker-endpoint-disabled-no-secret-configured' },
      { status: 503 }
    )
  }
  const provided = request.headers.get('x-worker-secret')
  if (provided !== expected) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // ---- parse -------------------------------------------------------------
  let body: any
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'invalid-json' }, { status: 400 }) }

  const {
    videoId, jobId, status,
    videoUrl, thumbnailUrl, duration,
    // Accepted but not persisted: error, provider, progress, completedAt.
    // Workers log those for observability.
  } = body || {}

  if (!videoId || !status) {
    return NextResponse.json(
      { error: 'missing-required-fields', required: ['videoId', 'status'] },
      { status: 400 }
    )
  }
  if (!['PROCESSING', 'COMPLETED', 'FAILED'].includes(status)) {
    return NextResponse.json(
      { error: 'invalid-status', got: status, allowed: ['PROCESSING', 'COMPLETED', 'FAILED'] },
      { status: 400 }
    )
  }

  // ---- build safe payload ------------------------------------------------
  const incoming: Record<string, any> = { status: status.toLowerCase() }
  if (typeof videoUrl === 'string') incoming.videoUrl = videoUrl
  if (typeof thumbnailUrl === 'string') incoming.thumbnailUrl = thumbnailUrl
  if (typeof duration === 'number') incoming.duration = duration

  const data: Record<string, any> = {}
  for (const [k, v] of Object.entries(incoming)) {
    if (VIDEO_UPDATE_WHITELIST.has(k)) data[k] = v
  }
  // When worker reports a real videoUrl, sync it to `url` column too (url is NOT NULL)
  if (incoming.videoUrl && !incoming.url) {
    data.url = incoming.videoUrl
  }

  // ---- update ------------------------------------------------------------
  try {
    const video = await prisma.video.update({ where: { id: videoId }, data })
    return NextResponse.json({
      ok: true,
      videoId: video.id,
      status: video.status,
      jobId: jobId ?? null,
      applied: Object.keys(data),
    })
  } catch (err: any) {
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'video-not-found', videoId }, { status: 404 })
    }
    console.error('[worker/video-update] update failed:', err)
    return NextResponse.json(
      { error: 'update-failed', detail: err?.message },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/worker/video-update',
    method: 'POST',
    headers: { 'x-worker-secret': '<WORKER_SHARED_SECRET>' },
    body: { videoId: 'cuid', jobId: 'string', status: 'PROCESSING | COMPLETED | FAILED' },
    persistedFields: Array.from(VIDEO_UPDATE_WHITELIST),
  })
}
