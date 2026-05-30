import { NextRequest, NextResponse } from 'next/server'

// Simple queue API using Neon PostgreSQL (no Upstash needed)
// Stores queue items in VideoQueue model
import { getAuthUser } from '@/lib/get-auth-user'
import { prisma } from '@/lib/prisma'

// Add job to rendering queue
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { topic, priority = 5 } = await req.json()

    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
    }

    // Check credits
    const customer = await prisma.customer.findUnique({
      where: { id: authUser.id },
      select: { credits: true },
    })

    if (!customer || customer.credits < 1) {
      return NextResponse.json({ error: 'Not enough credits' }, { status: 402 })
    }

    // Deduct 1 credit
    await prisma.customer.update({
      where: { id: authUser.id },
      data: { credits: { decrement: 1 } },
    })

    // Add to queue
    const queueItem = await prisma.videoQueue.create({
      data: {
        customerId: authUser.id,
        topic,
        priority,
        status: 'pending',
        maxAttempts: 3,
      },
    })

    // Set a notification for when processing completes
    // In production, this would be processed by a background worker
    // For now, mark as "processing" and let the cron pick it up
    await prisma.videoQueue.update({
      where: { id: queueItem.id },
      data: { status: 'queued' },
    })

    return NextResponse.json({
      success: true,
      queueId: queueItem.id,
      message: 'Video added to rendering queue',
    })
  } catch (error: any) {
    console.error('Queue error:', error?.message || error)
    return NextResponse.json({ error: 'Failed to queue video' }, { status: 500 })
  }
}

// Get queue status
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const queue = await prisma.videoQueue.findMany({
      where: { customerId: authUser.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return NextResponse.json({ queue })
  } catch (error: any) {
    console.error('Queue fetch error:', error?.message || error)
    return NextResponse.json({ error: 'Failed to load queue' }, { status: 500 })
  }
}
