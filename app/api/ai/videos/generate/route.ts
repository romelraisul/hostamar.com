export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enqueueVideoGeneration, type VideoGenerationJobData } from '@/lib/queue'

export async function POST(req: NextRequest) {
  try {
    const { templateId, prompt, title, style, duration = 30 } = await req.json().catch(() => ({}))

    if (!templateId || !prompt) {
      return NextResponse.json({ error: 'Template and prompt required' }, { status: 400 })
    }

    const jobData: VideoGenerationJobData = {
      script: prompt,
      style: style || 'modern',
      voiceOver: '',
      duration,
      userId: '00000000-0000-0000-0000-000000000001',
      previewId: undefined,
    }

    const job = await enqueueVideoGeneration(jobData)

    const video = await prisma.video.create({
      data: {
        title: title || 'Untitled Video',
        prompt,
        templateId,
        duration,
        status: 'processing',
        customer: { connect: { id: jobData.userId } },
      },
    })

    await prisma.videoQueue.create({
      data: {
        customerId: jobData.userId,
        topic: title || 'Untitled Video',
        priority: 5,
        status: 'queued',
        type: 'video',
        videoId: video.id,
      },
    })

    return NextResponse.json({
      success: true,
      videoId: video.id,
      jobId: job.id,
      status: 'QUEUED',
    })
  } catch (error) {
    console.error('AI video generate error:', error)
    return NextResponse.json({ error: 'Failed to generate video' }, { status: 500 })
  }
}