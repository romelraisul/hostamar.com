export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'
import { deductCredits } from '@/lib/credits'
import prisma from '@/lib/prisma'

// REAL (v12): previously an orphaned stub that POSTed to localhost:8188
// (impossible in prod → always 500) and returned a fake `jobId: Date.now()`
// with no charge. Now: atomic debit + a real Video/VideoQueue row for the
// local render worker, mirroring /api/dashboard/videos/create.
const VIDEO_COST = 50

export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { prompt, duration } = await request.json().catch(() => ({}))
  const topic = String(prompt || '').slice(0, 500) || 'AI video'

  const spend = await deductCredits(auth.id, -VIDEO_COST, 'spend', 'video/generate')
  if (!spend.ok) {
    return NextResponse.json(
      {
        error: 'INSUFFICIENT_CREDITS',
        message: 'ক্রেডিট শেষ। bKash 01822417463-এ পেমেন্ট করে ক্রেডিট কিনুন।',
        balance: spend.balance ?? 0,
        required: VIDEO_COST,
        bkash: '01822417463',
      },
      { status: 402 },
    )
  }

  const video = await prisma.video.create({
    data: {
      customerId: auth.id,
      title: topic.slice(0, 60),
      topic,
      prompt: topic,
      script: '',
      duration: Number(duration) || 30,
      format: 'mp4',
      resolution: '720p',
      language: 'bn',
      status: 'processing',
      url: '',
      fileSize: 0,
    },
  })
  await prisma.videoQueue
    .create({ data: { customerId: auth.id, topic, priority: 5, status: 'pending', videoId: video.id } })
    .catch(() => null)

  return NextResponse.json({
    success: true,
    message: 'ভিডিও তৈরি শুরু হয়েছে',
    videoId: video.id,
    creditsCharged: VIDEO_COST,
    creditsRemaining: spend.creditsRemaining,
  })
}
