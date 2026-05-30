import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/get-auth-user';
import { prisma } from '@/lib/prisma';

// Video rendering runs on the local Windows machine via cron worker.
// This API route creates the DB entry and returns — actual rendering
// is handled by the local render-worker.ts script.
// No import of @remotion/renderer here avoids FFmpeg binary build errors.

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
      select: { id: true, customerId: true, renderStatus: true },
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

    // Mark as queued for local render worker
    await prisma.preview.update({
      where: { id: previewId },
      data: { renderStatus: 'queued' },
    });

    // Add to video queue for local worker
    await prisma.videoQueue.create({
      data: {
        customerId: authUser.id,
        topic: previewId,
        type: 'render',
        status: 'queued',
        priority: 1,
      },
    });

    return NextResponse.json({
      success: true,
      status: 'queued',
      message: 'Queued for local render worker',
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
