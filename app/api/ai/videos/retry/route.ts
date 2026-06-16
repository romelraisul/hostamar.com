import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { addVideoJob } from '@/lib/queue'

/**
 * POST /api/ai/videos/retry
 * Body: { videoId: string }
 *
 * Resets a failed video to 'processing' and re-enqueues it for generation.
 */
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: { videoId?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { videoId } = body
    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 })
    }

    // Load the video and verify ownership
    const video = await prisma.video.findUnique({ where: { id: videoId } })
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }
    if (video.customerId !== authUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (video.status !== 'failed') {
      return NextResponse.json(
        { error: 'Only failed videos can be retried', currentStatus: video.status },
        { status: 400 }
      )
    }

    // Reset to processing
    await prisma.video.update({
      where: { id: videoId },
      data: {
        status: 'processing',
        url: `pending:${videoId}`,  // placeholder while being regenerated
      },
    })

    // Re-enqueue the job
    await addVideoJob({
      videoId,
      prompt: video.prompt || video.title,
      style: video.style || video.topic || 'cinematic',
      duration: video.duration || 5,
      aspectRatio: (video.aspectRatio as '16:9' | '9:16' | '1:1') || '16:9',
    })

    return NextResponse.json({
      success: true,
      videoId,
      status: 'processing',
      message: 'Video re-queued — processing will resume shortly',
    })
  } catch (err: any) {
    console.error('[ai/videos/retry] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
