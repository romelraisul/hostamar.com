import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// The queue process route is designed to work on Vercel by setting DB state only.
// Actual video rendering runs on the local Windows machine via the cron worker.
// This avoids bundling @remotion/renderer (FFmpeg binaries) on Vercel.

export async function POST(req: NextRequest) {
  try {
    const { secret } = await req.json().catch(() => ({ secret: '' }))
    
    const queueSecret = process.env.QUEUE_SECRET || 'hostamar-dev-secret'
    if (secret !== queueSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get next pending item
    const nextJob = await prisma.videoQueue.findFirst({
      where: { status: 'queued' },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
    })

    if (!nextJob) {
      return NextResponse.json({ message: 'No pending jobs' })
    }

    // Mark as processing (local worker will render and update)
    await prisma.videoQueue.update({
      where: { id: nextJob.id },
      data: { 
        status: 'processing', 
        attempts: { increment: 1 },
        processedAt: new Date(),
      },
    })

    return NextResponse.json({ 
      success: true, 
      jobId: nextJob.id, 
      status: 'processing',
      message: 'Job marked for local render worker' 
    })
  } catch (error: any) {
    console.error('Queue worker error:', error?.message || error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
