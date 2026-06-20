import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * GET /api/videos/status/[id]
 *
 * Returns the current status of a video generation job.
 * Used by the /generate page to poll for completion.
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
        format: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!video) {
      return NextResponse.json({ error: 'not found' }, { status: 404 })
    }

    return NextResponse.json({
      videoId: video.id,
      status: video.status,
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
