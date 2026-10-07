export const runtime = 'nodejs';
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
    const unavailable = error?.name === 'QueueUnavailableError' || error?.status === 503;
    return NextResponse.json(
      {
        error: error?.message || 'Failed to enqueue video generation job',
        code: unavailable ? 'queue_unavailable' : undefined,
      },
      { status: unavailable ? 503 : 500 }
    );
  }
}

/**
 * GET /api/queue/generate — 405, not a hang.
 *
 * This is a POST-only route. The old handler opened a BullMQ connection just to
 * read counts; on workerd there is no TCP/Redis, so the import never settled and
 * the edge cancelled the request at 25s (the audit's "000"). The Turso-backed
 * queue list lives at GET /api/queue.
 */
export async function GET() {
  return NextResponse.json(
    {
      error: 'Method not allowed',
      code: 'use_post',
      hint: 'POST to enqueue; GET /api/queue for the Turso-backed queue list',
    },
    { status: 405, headers: { Allow: 'POST' } }
  );
}
