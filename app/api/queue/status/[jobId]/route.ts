import { NextRequest, NextResponse } from 'next/server';
import { getQueue, QUEUE_NAMES } from '@/lib/queue';

/**
 * GET /api/queue/status/[jobId]
 *
 * Polls the status of a video generation job.
 * Returns: { jobId, status, progress, result, error, timestamps }
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    if (!jobId || typeof jobId !== 'string') {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    const queue = getQueue(QUEUE_NAMES.VIDEO_GENERATION);

    // Fetch the job from BullMQ
    const job = await queue.getJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found', jobId },
        { status: 404 }
      );
    }

    // Determine the job state
    const state = await job.getState();

    // Build response
    const response: Record<string, unknown> = {
      jobId: job.id,
      queueName: QUEUE_NAMES.VIDEO_GENERATION,
      state,
      status: mapStateToStatus(state),
      progress: job.progress || 0,
      data: {
        userId: job.data.userId,
        style: job.data.style,
        duration: job.data.duration,
        previewId: job.data.previewId || null,
      },
      timestamps: {
        createdAt: job.timestamp ? new Date(job.timestamp).toISOString() : null,
        processedAt: job.processedOn ? new Date(job.processedOn).toISOString() : null,
        finishedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
      },
      attempts: job.attemptsMade,
      maxAttempts: job.opts?.attempts || 3,
    };

    // Add result if completed
    if (state === 'completed' && job.returnvalue) {
      response.result = job.returnvalue;
    }

    // Add error info if failed
    if (state === 'failed') {
      response.error = job.failedReason || 'Unknown error';
      response.stacktrace = (job.stacktrace || []).slice(0, 3); // first 3 lines
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Queue Status API] Error:', error?.message || error);
    return NextResponse.json(
      { error: 'Failed to fetch job status' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/queue/status/[jobId]
 *
 * Removes a job from the queue (completed/failed jobs) or cancels it (active/waiting jobs).
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    const queue = getQueue(QUEUE_NAMES.VIDEO_GENERATION);
    const job = await queue.getJob(jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const state = await job.getState();

    if (state === 'waiting' || state === 'delayed') {
      await job.remove();
    } else if (state === 'active' || state === 'completed') {
      // For active jobs, we need to move them to failed first
      try {
        await job.discard();
      } catch {
        // ignore if already completed
      }
      await job.remove();
    } else {
      await job.remove();
    }

    return NextResponse.json({
      success: true,
      jobId,
      message: `Job ${jobId} removed from queue`,
    });
  } catch (error: any) {
    console.error('[Queue Status API] DELETE error:', error?.message || error);
    return NextResponse.json(
      { error: 'Failed to remove job' },
      { status: 500 }
    );
  }
}

/**
 * Map BullMQ states to human-readable status labels.
 */
function mapStateToStatus(state: string): string {
  switch (state) {
    case 'waiting':
    case 'delayed':
      return 'queued';
    case 'active':
      return 'processing';
    case 'completed':
      return 'complete';
    case 'failed':
      return 'failed';
    case 'paused':
      return 'paused';
    default:
      return 'unknown';
  }
}
