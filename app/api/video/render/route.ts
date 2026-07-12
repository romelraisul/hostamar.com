export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'
import { prisma } from '@/lib/prisma'
import { enqueueVideoGeneration } from '@/lib/queue'

/**
 * POST /api/video/render
 *
 * Triggers video rendering for a given Preview record.
 * Body: { previewId: string }
 * Returns: { success, videoUrl, thumbnailUrl, status }
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { previewId } = await req.json().catch(() => ({}));

    if (!previewId || typeof previewId !== 'string') {
      return NextResponse.json({ error: 'previewId is required' }, { status: 400 });
    }

    // Verify preview exists and belongs to user
    const preview = await prisma.preview.findUnique({
      where: { id: previewId },
      select: { 
        id: true, 
        customerId: true, 
        renderStatus: true,
        script: true,
        style: true,
        duration: true,
        title: true,
      },
    });

    if (!preview) {
      return NextResponse.json({ error: 'Preview not found' }, { status: 404 });
    }

    if (preview.customerId !== authUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (preview.renderStatus === 'complete') {
      const completePreview = await prisma.preview.findUnique({
        where: { id: previewId },
        select: { videoUrl: true, thumbnailUrl: true },
      });

      return NextResponse.json({
        success: true,
        videoUrl: completePreview?.videoUrl || null,
        thumbnailUrl: completePreview?.thumbnailUrl || null,
        status: 'complete',
        message: 'Video already rendered',
      });
    }

    // Get script from preview or use title as fallback
    const script = preview.script || preview.title || 'Generate a video from this preview';
    const style = preview.style || 'modern';
    const duration = preview.duration || 30;

    // Mark preview as queued
    await prisma.preview.update({
      where: { id: previewId },
      data: { renderStatus: 'queued' },
    });

    // Add to Prisma VideoQueue for legacy worker compatibility
    await prisma.videoQueue.create({
      data: {
        customerId: authUser.id,
        topic: previewId,
        type: 'render',
        status: 'queued',
        priority: 1,
      },
    });

    // Also enqueue to BullMQ for new ComfyUI worker
    const bullJob = await enqueueVideoGeneration({
      script,
      style,
      voiceOver: '', // No voiceover for now
      duration,
      userId: authUser.id,
      previewId,
    });

    console.log(`[Video Render API] Enqueued BullMQ job ${bullJob.id} for preview ${previewId}`);

    return NextResponse.json({
      success: true,
      status: 'queued',
      message: 'Queued for video generation worker',
      jobId: bullJob.id,
    });
  } catch (error: any) {
    console.error('[Video Render API] Error:', error?.message || error);

    // If we have a previewId, try to mark as failed
    try {
      const body = await req.json().catch(() => ({}));
      if (body?.previewId) {
        await prisma.preview.update({
          where: { id: body.previewId },
          data: {
            renderStatus: 'failed',
            renderError: error?.message || 'Render failed',
          },
        });
      }
    } catch {
      // best-effort
    }

    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Video rendering failed',
        status: 'failed',
      },
      { status: 500 }
    );
  }
}