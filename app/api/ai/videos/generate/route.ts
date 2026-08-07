import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enqueueVideoGeneration, type VideoGenerationJobData, initRedis } from '@/lib/queue'
import { getAuthUser } from '@/lib/get-auth-user'

export async function POST(req: NextRequest) {
  try {
    // Initialize Redis failover
    await initRedis()
    
    // Get authenticated user
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { templateId, prompt, title, style, duration = 30 } = await req.json().catch(() => ({}))

    if (!templateId || !prompt) {
      return NextResponse.json({ error: 'Template and prompt required' }, { status: 400 })
    }

    const jobData: VideoGenerationJobData = {
      script: prompt,
      style: style || 'modern',
      voiceOver: '',
      duration,
      userId: user.id,
      previewId: undefined,
    }

    console.log('[VideoGen] Enqueueing job for user:', user.id)
    const job = await Promise.race([
      enqueueVideoGeneration(jobData),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('enqueueVideoGeneration timeout after 30s')), 30000)
      )
    ])
    console.log('[VideoGen] Job enqueued:', job.id)

    const video = await prisma.video.create({
      data: {
        title: title || 'Untitled Video',
        prompt,
        templateId,
        duration,
        status: 'processing',
        customer: { connect: { id: user.id } },
      },
    })

    await prisma.videoQueue.create({
      data: {
        customerId: user.id,
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
      const message = error instanceof Error ? error.message : String(error)
      const stack = error instanceof Error ? error.stack : undefined
      console.error('AI video generate error details:', { message, stack })
      return NextResponse.json({ error: 'Failed to generate video', details: message }, { status: 500 })
    }
}