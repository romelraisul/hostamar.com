import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const [videos, queue] = await Promise.all([
      prisma.video.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { email: true },
          },
        },
      }),
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
    })
  } catch (error) {
    console.error('Admin videos fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}