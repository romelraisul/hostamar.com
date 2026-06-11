import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const [videos, videoCount, queue] = await Promise.all([
      prisma.video.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { email: true },
          },
        },
      }),
      prisma.video.count(),
      prisma.videoQueue.findMany({
        orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      }),
    ])

    const formattedVideos = videos.map(v => ({
      id: v.id,
      title: v.title,
      topic: v.topic,
      status: v.status,
      customerEmail: v.customer?.email || 'Unknown',
      createdAt: v.createdAt.toISOString(),
    }))

    const formattedQueue = queue.map(q => ({
      id: q.id,
      topic: q.topic,
      priority: q.priority,
      status: q.status,
      attempts: q.attempts,
      customerEmail: 'Unknown',
      createdAt: q.createdAt.toISOString(),
    }))

    return NextResponse.json({ 
      videos: formattedVideos,
      queue: formattedQueue,
      pagination: {
        page,
        limit,
        total: videoCount,
        totalPages: Math.ceil(videoCount / limit),
        hasMore: skip + limit < videoCount,
      },
    })
  } catch (error) {
    console.error('Admin videos fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}