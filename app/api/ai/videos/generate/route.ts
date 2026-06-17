import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { addVideoJob } from '@/lib/queue'

/**
 * POST /api/ai/videos/generate
 *
 * Phase 1.1: creates a DB record + enqueues BullMQ job.
 * The Python GPU worker picks it up, calls HF Inference API
 * (damo-vilab/ModelScope_t2v), and POSTs result back via
 * /api/worker/video-update.
 *
 * Request body: {
 *   prompt: string        (required — the main text prompt)
 *   title?: string        (video title, defaults to "Untitled Video")
 *   templateId?: string    (video template/style preset)
 *   style?: string        (cinematic, anime, realistic, etc.)
 *   duration?: number      (seconds, default 5)
 *   aspectRatio?: string  (16:9, 9:16, 1:1 — default 16:9)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { prompt, title, templateId, style = 'cinematic', duration = 5, aspectRatio = '16:9' } = body

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
      return NextResponse.json(
        { error: 'prompt is required (min 3 chars)' },
        { status: 400 }
      )
    }

    // 1. Create DB record
    // videoId placeholder — worker will replace with real URL via /api/worker/video-update
    const tempId = `temp_${Date.now().toString(36)}`
    const video = await prisma.video.create({
      data: {
        customerId: user.id,
        title:    (title && typeof title === 'string') ? title.trim() : 'Untitled Video',
        script:   prompt.trim(),
        topic:    prompt.trim().slice(0, 120),   // topic mirrors the prompt (NOT NULL, no default)
        duration: Number(duration) || 5,
        format:   'mp4',                          // NOT NULL, no default
        resolution: '1080p',                       // NOT NULL, no default
        language: 'bn',                            // NOT NULL, no default
        status:   'processing',                    // NOT NULL, no default
        url:      `pending:${tempId}`,             // placeholder until worker updates
        downloads: 0,                             // NOT NULL, no default
        views:    0,                              // NOT NULL, no default
        shares:   0,                              // NOT NULL, no default
        prompt:   prompt.trim(),                   // optional but set for traceability
        templateId: templateId || 'default',
      },
    })

    // 2. Enqueue BullMQ job for the Python GPU worker
    await addVideoJob({
      videoId: video.id,
      prompt: prompt.trim(),
      style: String(style),
      duration: Number(duration) || 5,
      userId: user.id,
      priority: 0,
    })

    return NextResponse.json({
      success: true,
      videoId: video.id,
      status: 'processing',
      message: 'Video generation queued — result in ~30s',
    })
  } catch (error) {
    console.error('[ai/videos/generate]', error)
    return NextResponse.json({ error: 'Failed to generate video' }, { status: 500 })
  }
}
