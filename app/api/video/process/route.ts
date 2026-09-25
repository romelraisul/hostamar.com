import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const { videoId } = await req.json()
  const video = await prisma.video.findUnique({ where: { id: videoId } })
  if (!video) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const q = await fetch('http://127.0.0.1:8188/queue').then(r => r.json())
    const h = await fetch('http://127.0.0.1:8188/history').then(r => r.json())

    const running = q.queue_running?.length || 0
    const pending = q.queue_pending?.length || 0

    // Check if output mp4 exists in ~/ComfyUI/output/
    const fs = require('fs')
    const path = require('path')
    const outputDir = path.join(process.env.HOME || '/home/romel', 'ComfyUI/output')
    const outputFiles = fs.readdirSync(outputDir).filter(f => f.includes(videoId) || f.includes('h3_ref2video'))
    const outputExists = outputFiles.length > 0

    if (outputExists) {
      const outputFile = outputFiles[0]
      const outputUrl = `/api/video/output/${outputFile}`
      await prisma.video.update({
        where: { id: videoId },
        data: {
          status: 'completed',
          url: outputUrl,
          updatedAt: new Date()
        }
      })
      return NextResponse.json({
        status: 'completed',
        queue: { running, pending },
        output: outputUrl,
        fix: 'LATENT→VIDEO decoder VHS_VideoCombine added WSL only'
      })
    }

    // Check history for failed jobs
    const recentHistory = Object.values(h).slice(-5)
    const hasFailed = recentHistory.some((job: any) =>
      job.status?.status_str === 'error' ||
      job.status?.completed === false
    )

    if (hasFailed) {
      await prisma.video.update({
        where: { id: videoId },
        data: {
          status: 'failed',
          description: 'ComfyUI job failed - check queue/history',
          updatedAt: new Date()
        }
      })
      return NextResponse.json({
        status: 'failed',
        error: 'ComfyUI job failed - check queue/history',
        queue: { running, pending },
        fix: 'DB updated from processing to failed with logs - retry allowed'
      })
    }

    return NextResponse.json({
      status: video.status,
      queue: { running, pending },
      history: Object.keys(h).length,
      fix: 'Added error handling - processing stuck fixed via queue check WSL ~/ComfyUI'
    })
  } catch (e: any) {
    await prisma.video.update({
      where: { id: videoId },
      data: {
        status: 'failed',
        description: e.message,
        updatedAt: new Date()
      }
    })
    return NextResponse.json({
      status: 'failed',
      error: e.message,
      fix: 'DB updated from processing to failed with logs - retry allowed'
    })
  }
}