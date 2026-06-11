import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const authUser = await getAuthUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')))
    const skip = (page - 1) * limit

    const [videos, videoCount] = await Promise.all([
      prisma.video.findMany({
        where: { customerId: authUser.id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.video.count({ where: { customerId: authUser.id } }),
    ])

    return NextResponse.json({
      videos,
      pagination: {
        page,
        limit,
        total: videoCount,
        totalPages: Math.ceil(videoCount / limit),
        hasMore: skip + limit < videoCount,
      },
    })
  } catch (error) {
    console.error('Videos fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const authUser = await getAuthUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('id')

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 })
    }

    // Verify the video belongs to this user
    const video = await prisma.video.findFirst({
      where: { id: videoId, customerId: authUser.id },
    })

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    // Delete related queue entries first
    await prisma.videoQueue.deleteMany({
      where: { videoId },
    })

    // Delete the video
    await prisma.video.delete({
      where: { id: videoId },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        customerId: authUser.id,
        action: 'video_deleted',
        description: `Deleted video: ${video.title}`,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Video deletion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
