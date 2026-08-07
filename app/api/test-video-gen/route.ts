export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enqueueVideoGeneration, type VideoGenerationJobData, initRedis } from '@/lib/queue'

export async function POST(req: Request) {
  try {
    await initRedis()
    console.log('[TestVideoGen] Redis initialized')
    
    const jobData: VideoGenerationJobData = {
      script: 'test prompt',
      style: 'modern',
      voiceOver: '',
      duration: 30,
      userId: 'test-user-id',
      previewId: undefined,
    }

    console.log('[TestVideoGen] Enqueueing job...')
    const job = await Promise.race([
      enqueueVideoGeneration(jobData),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('enqueueVideoGeneration timeout after 30s')), 30000)
      )
    ])
    console.log('[TestVideoGen] Job enqueued:', job.id)

    return NextResponse.json({
      success: true,
      jobId: job.id,
      jobData: job.data
    })
  } catch (error) {
    console.error('[TestVideoGen] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
