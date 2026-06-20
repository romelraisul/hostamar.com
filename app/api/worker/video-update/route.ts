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

// Whitelist of DB columns that may be written by the worker callback.
// Maps the worker's payload keys directly to Video table columns.
const VIDEO_UPDATE_WHITELIST = new Set([
  'status',
  'url',           // worker reports 'url' or 'videoUrl' — both map here
  'thumbnailUrl',  // same column name in DB and worker
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
  // Worker sends 'videoUrl'; DB column is 'url'
  if (typeof videoUrl === 'string') incoming.url = videoUrl
  if (typeof thumbnailUrl === 'string') incoming.thumbnailUrl = thumbnailUrl
  if (typeof duration === 'number') incoming.duration = duration

  const data: Record<string, any> = {}
  for (const [k, v] of Object.entries(incoming)) {
    if (VIDEO_UPDATE_WHITELIST.has(k)) data[k] = v
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
