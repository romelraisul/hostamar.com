import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/video/status/[jobId] — Check render progress
export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const job = await prisma.videoJob.findUnique({
      where: { id: params.jobId },
      include: { scenes: true },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const doneScenes = job.scenes.filter((s: any) => s.status === 'done').length
    const totalScenes = job.scenes.length
    const progress = totalScenes > 0 ? Math.round((doneScenes / totalScenes) * 100) : 0

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      progress,
      scenes: job.scenes,
      videoUrl: job.outputUrl,
      error: job.errorMessage,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
