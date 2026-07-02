import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const previewId = params.id

    if (!previewId) {
      return NextResponse.json({ error: 'Preview ID is required' }, { status: 400 });
    }

    const video = await prisma.video.findUnique({
      where: { id: previewId },
      select: {
        id: true,
        status: true,
        url: true,
        thumbnailUrl: true,
        title: true,
        duration: true,
        prompt: true,
        templateId: true,
        updatedAt: true,
      },
    })

    if (video) {
      const status = video.status
      const progress =
        status === 'ready' || status === 'complete' ? 1.0 :
        status === 'failed' ? 0 :
        status === 'processing' || status === 'generating' ? 0.5 :
        status === 'queued' ? 0.1 : 0

      return NextResponse.json({
        success: true,
        previewId: video.id,
        status,
        progress: Math.round(progress * 100),
        videoUrl: video.url || null,
        thumbnailUrl: video.thumbnailUrl || null,
        error: null,
        title: video.title,
        duration: video.duration,
        prompt: video.prompt,
        style: null,
        templateId: video.templateId || null,
        updatedAt: video.updatedAt?.toISOString() || null,
      });
    }

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
    })

    if (!preview) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const status = preview.renderStatus
    const progress =
      status === 'complete' ? 1.0 :
      status === 'failed' ? 0 :
      status === 'generating' ? 0.5 :
      status === 'queued' ? 0.1 : 0

    return NextResponse.json({
      success: true,
      previewId: preview.id,
      status,
      progress: Math.round(progress * 100),
      videoUrl: preview.videoUrl || null,
      thumbnailUrl: preview.thumbnailUrl || null,
      error: preview.renderError || null,
      title: preview.title,
      duration: preview.duration,
      prompt: preview.prompt,
      style: preview.style || null,
      templateId: null,
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
