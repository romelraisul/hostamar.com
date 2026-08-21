export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { enqueueVideoGeneration } from '@/lib/queue'

// Canonical video generation cost (matches dashboard "Generate -100cr").
const VIDEO_COST = 100

/**
 * POST /api/video/generate
 *
 * Core product endpoint. Creates a video job in the DB, deducts credits,
 * and enqueues it for the ComfyUI render worker (BullMQ + Prisma VideoQueue).
 *
 * Body: { prompt: string, title?: string, style?: string, duration?: number,
 *         format?: string, language?: string }
 * Returns: { success, jobId, videoId, status, creditsUsed, creditsRemaining }
 *
 * Auth: custom auth_token cookie via getAuthUser (no NextAuth session).
 * ComfyUI is reached by the worker via COMFYUI_PUBLIC_URL / AI gateway —
 * never localhost from Vercel.
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const {
      prompt,
      title,
      style = 'modern',
      duration = 30,
      format = '9:16',
      language = 'bn',
    } = body

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }

    // Tenant (may be undefined pre-membership)
    const { getCurrentOrg } = await import('@/lib/tenancy/tenant')
    const orgId = await getCurrentOrg(authUser.id).catch(() => undefined)

    // Credit check
    const customer = await prisma.customer.findUnique({
      where: { id: authUser.id },
      select: { credits: true },
    })
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }
    const currentCredits = customer.credits || 0
    if (currentCredits < VIDEO_COST) {
      return NextResponse.json(
        { error: `Insufficient credits. Need ${VIDEO_COST}, have ${currentCredits}. Add credits via bKash.` },
        { status: 403 }
      )
    }

    // Deduct credits + create the video job atomically-ish
    const videoTitle = (title && String(title).trim()) || prompt.slice(0, 60)
    const video = await prisma.video.create({
      data: {
        customerId: authUser.id,
        title: videoTitle,
        prompt: prompt.trim(),
        script: '',
        duration: Math.min(120, Math.max(5, Number(duration) || 30)),
        format: format === '9:16' ? 'webm' : String(format || 'webm'),
        resolution: '720p',
        language,
        status: 'queued',
        url: '',
        fileSize: 0,
        topic: style,
        ...(orgId ? { organizationId: orgId } : {}),
      },
    })

    await prisma.customer.update({
      where: { id: authUser.id },
      data: { credits: { decrement: VIDEO_COST } },
    })

    // Durable queue row (legacy worker + status tracking)
    const queueRow = await prisma.videoQueue.create({
      data: {
        customerId: authUser.id,
        topic: prompt.trim(),
        type: 'generate',
        status: 'queued',
        priority: 5,
        videoId: video.id,
      },
    })

    // Audit ledger — non-fatal. Some environments have CreditTransaction
    // schema drift (missing columns); never block video creation on it.
    await prisma.creditTransaction
      .create({
        data: {
          customerId: authUser.id,
          amount: -VIDEO_COST,
          type: 'video_generation',
          description: `Video generation: ${videoTitle}`,
          balanceAfter: currentCredits - VIDEO_COST,
          videoId: video.id,
          videoQueueId: queueRow.id,
        },
      })
      .catch((e) => console.warn('[video/generate] credit ledger skipped:', e?.message?.slice(0, 120)))

    await prisma.activityLog
      .create({
        data: {
          customerId: authUser.id,
          action: 'video_generated',
          description: `Generated video: ${videoTitle} (cost: ${VIDEO_COST} credits)`,
          metadata: JSON.stringify({ videoId: video.id, cost: VIDEO_COST }),
        },
      })
      .catch(() => {})

    // Enqueue to BullMQ for the ComfyUI worker. If Redis is unreachable the
    // Prisma VideoQueue row above still holds the job for the legacy worker.
    let bullJobId: string | null = null
    try {
      const bullJob = await enqueueVideoGeneration({
        script: prompt.trim(),
        style,
        voiceOver: '',
        duration: video.duration,
        userId: authUser.id,
        videoId: video.id,
      })
      bullJobId = String(bullJob.id)
    } catch (qErr: any) {
      console.warn('[video/generate] BullMQ enqueue failed, job stays in Prisma VideoQueue:', qErr?.message)
    }

    return NextResponse.json({
      success: true,
      jobId: bullJobId || queueRow.id,
      videoId: video.id,
      status: 'queued',
      creditsUsed: VIDEO_COST,
      creditsRemaining: currentCredits - VIDEO_COST,
    })
  } catch (error: any) {
    console.error('[video/generate] Error:', error?.message || error)
    return NextResponse.json({ error: error?.message || 'Video generation failed' }, { status: 500 })
  }
}
