import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// No import of @/lib/video-renderer — Remotion FFmpeg binaries can't build on Vercel.
// Render progress is tracked in the DB by the local render worker.

/**
 * GET /api/video/status/[id]
 *
 * Polls render status for a Preview record.
 * Returns current status, videoUrl, thumbnailUrl, and progress.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const previewId = params.id;

    if (!previewId) {
      return NextResponse.json({ error: 'Preview ID is required' }, { status: 400 });
    }

    // Get DB record
    const preview = await prisma.preview.findUnique({
      where: { id: previewId },
      select: {
        id: true,
        renderStatus: true,
        renderError: true,
        videoUrl: true,
        thumbnailUrl: true,
        title: true,
        duration: true,
        prompt: true,
        style: true,
        updatedAt: true,
      },
    });

    if (!preview) {
      return NextResponse.json({ error: 'Preview not found' }, { status: 404 });
    }

    // Calculate progress from DB state
    const status = preview.renderStatus;
    const progress = (
      status === 'complete' ? 1.0 :
      status === 'failed' ? 0 :
      status === 'generating' ? 0.5 :
      status === 'queued' ? 0.1 :
      0
    );

    return NextResponse.json({
      success: true,
      previewId: preview.id,
      status: preview.renderStatus,
      progress: Math.round(progress * 100),
      videoUrl: preview.videoUrl || null,
      thumbnailUrl: preview.thumbnailUrl || null,
      error: preview.renderError || null,
      title: preview.title,
      duration: preview.duration,
      prompt: preview.prompt,
      style: preview.style,
      updatedAt: preview.updatedAt?.toISOString() || null,
    });
  } catch (error: any) {
    console.error('[Video Status API] Error:', error?.message || error);
    return NextResponse.json(
      { error: 'Failed to fetch render status' },
      { status: 500 }
    );
  }
}
