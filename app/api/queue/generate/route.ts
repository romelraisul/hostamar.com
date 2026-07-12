export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/get-auth-user';
import { enqueueVideoGeneration, type VideoGenerationJobData } from '@/lib/queue';

/**
 * POST /api/queue/generate
 *
 * Enqueues a video generation job and returns the job ID.
 * The caller can poll /api/queue/status/[jobId] for progress.
 *
 * Body: { script, style, voiceOver, duration, previewId? }
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate body
    const body = await req.json().catch(() => ({}));
    const { script, style, voiceOver, duration, previewId } = body;

    if (!script || typeof script !== 'string' || script.trim().length === 0) {
      return NextResponse.json(
        { error: 'script is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (!duration || typeof duration !== 'number' || duration < 5 || duration > 300) {
      return NextResponse.json(
        { error: 'duration is required and must be between 5 and 300 seconds' },
        { status: 400 }
      );
    }

    const validStyles = ['cinematic', 'modern', 'vintage', 'minimalist'];
    const resolvedStyle = style && validStyles.includes(style) ? style : 'modern';

    // Enqueue the job
    const jobData: VideoGenerationJobData = {
      script: script.trim(),
      style: resolvedStyle,
      voiceOver: voiceOver || '',
      duration,
      userId: authUser.id,
      previewId: previewId || undefined,
    };

    const job = await enqueueVideoGeneration(jobData);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      queueName: 'video-generation',
      status: 'queued',
      message: 'Video generation job enqueued. Poll /api/queue/status/' + job.id + ' for updates.',
    });
  } catch (error: any) {
    console.error('[Queue Generate API] Error:', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Failed to enqueue video generation job' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/queue/generate
 *
 * Returns the current status of the video generation queue (counts).
 */
export async function GET(_req: NextRequest) {
  try {
    const { getVideoGenerationQueue } = await import('@/lib/queue');
    const queue = getVideoGenerationQueue();

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return NextResponse.json({
      success: true,
      queue: 'video-generation',
      counts: {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed,
      },
    });
  } catch (error: any) {
    console.error('[Queue Generate API] GET error:', error?.message || error);
    return NextResponse.json(
      { error: 'Failed to get queue status' },
      { status: 500 }
    );
  }
}