import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * GET /api/videos/status/[id]
 *
 * Returns the current status and progress of a video generation job.
 */
export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = params.id
  if (!id || id.length < 5) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 })
  }

  try {
    const video = await prisma.video.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        url: true,
        thumbnailUrl: true,
        duration: true,
        progress: true,
        format: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!video) {
      return NextResponse.json({ error: 'not found' }, { status: 404 })
    }

    // Map DB status to frontend stage label
    const stageMap: Record<string, string> = {
      processing: 'rendering',
      completed: 'completed',
      failed: 'failed',
    }

    return NextResponse.json({
      videoId: video.id,
      status: video.status,
      stage: stageMap[video.status] || video.status,
      progress: video.progress ?? 0,
      url: video.url,
      thumbnailUrl: video.thumbnailUrl,
      duration: video.duration,
      format: video.format,
      title: video.title,
      createdAt: video.createdAt,
      updatedAt: video.updatedAt,
    })
  } catch (err: any) {
    console.error('[videos/status]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
