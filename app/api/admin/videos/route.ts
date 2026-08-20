export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
                select: { email: true, name: true },
              },
              creditTransactions: {
                where: { type: 'video_generation' },
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          }),
          prisma.video.count(),
          prisma.videoQueue.findMany({
            orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
            include: {
              customer: {
                select: { email: true, name: true },
              },
              creditTransactions: {
                where: { type: 'video_generation' },
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          }),
        ])

    const formattedVideos = videos.map(v => ({
          id: v.id,
          title: v.title,
          topic: v.topic,
          status: v.status,
          customerEmail: v.customer?.email || 'Unknown',
          customerName: v.customer?.name || 'Unknown',
          createdAt: v.createdAt.toISOString(),
          creditsUsed: v.creditTransactions[0] ? Math.abs(v.creditTransactions[0].amount) : 0,
          creditsRemaining: v.creditTransactions[0] ? v.creditTransactions[0].balanceAfter : null,
          duration: v.duration,
          format: v.format,
          resolution: v.resolution,
          fileSize: v.fileSize,
          url: v.url,
        }))

        const formattedQueue = queue.map(q => ({
          id: q.id,
          topic: q.topic,
          priority: q.priority,
          status: q.status,
          attempts: q.attempts,
          customerEmail: q.customer?.email || 'Unknown',
          customerName: q.customer?.name || 'Unknown',
          createdAt: q.createdAt.toISOString(),
          creditsUsed: q.creditTransactions?.[0] ? Math.abs(q.creditTransactions[0].amount) : 0,
          creditsRemaining: q.creditTransactions?.[0] ? q.creditTransactions[0].balanceAfter : null,
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