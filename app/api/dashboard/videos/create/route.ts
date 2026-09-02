export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request)

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // PR d: resolve tenant for this customer (may be undefined pre-membership).
    const { getCurrentOrg } = await import('@/lib/tenancy/tenant')
    const orgId = await getCurrentOrg(authUser.id).catch(() => undefined)

    const body = await request.json()
    const { title, topic, description, language = 'bn' } = body

    if (!title || !topic) {
      return NextResponse.json({ error: 'Title and topic are required' }, { status: 400 })
    }

    // Get customer to check credits
        const customer = await prisma.customer.findUnique({
          where: { id: authUser.id },
          select: { credits: true }
        })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Get active subscription to check limits
    const subscription = await prisma.subscription.findFirst({
      where: {
        customerId: authUser.id,
        status: 'active',
      },
    })

    // Calculate video cost (1 credit per video, premium videos = 3 credits)
    const isPremium = topic.toLowerCase().includes('premium') || topic.toLowerCase().includes('4k') || topic.toLowerCase().includes('hd')
    const videoCost = isPremium ? 3 : 1

    const videosPerMonth = subscription?.videosPerMonth || 10
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const videosThisMonth = await prisma.video.count({
      where: {
        customerId: authUser.id,
        createdAt: { gte: startOfMonth },
      },
    })

    // Check monthly video limit
    if (videosThisMonth >= videosPerMonth) {
      return NextResponse.json({
        error: `Monthly video limit reached (${videosPerMonth} videos). Upgrade your plan for more.`
      }, { status: 403 })
    }

    // Check credits
    const currentCredits = customer.credits || 0
    if (currentCredits < videoCost) {
      return NextResponse.json({
        error: `Insufficient credits. Need ${videoCost} credits, have ${currentCredits}. Please add credits.`
      }, { status: 403 })
    }

    // Deduct credits
    await prisma.customer.update({
      where: { id: authUser.id },
      data: { credits: { decrement: videoCost } }
    })

    const video = await prisma.video.create({
      data: {
        customerId: authUser.id,
        title,
        topic,
        description: description || null,
        script: '',
        duration: 60,
        format: 'webm',
        resolution: isPremium ? '1080p' : '720p',
        language,
        status: 'processing',
        url: '',
        fileSize: 0,
        ...(orgId ? { organizationId: orgId } : {}),
      },
    })

    // Add to video queue for processing
    await prisma.videoQueue.create({
      data: {
        customerId: authUser.id,
        topic,
        priority: 5,
        status: 'pending',
        videoId: video.id,
      }
    }).catch(() => null)

    // V30: QUEUE-FIRST. The local HunyuanVideo 1.5 8B worker (this PC, ComfyUI
    // @127.0.0.1:8188, re-installed after the 2026-09-02 disk cleanup) consumes
    // VideoQueue rows via /api/videos/queue/next every 10s and produces a real
    // 30s 9:16 motion video. When the worker mode is ENABLED
    // (COMFYUI_WORKER_SECRET set in this deployment) we SKIP inline processing
    // entirely — the row stays `processing` until the worker renders and calls
    // /api/videos/upload/complete. When the secret is UNSET (worker offline /
    // plain serverless deployment), the V28 inline pipeline runs as fallback so
    // the row NEVER strands (V28 lesson: always transition).
    if (process.env.COMFYUI_WORKER_SECRET) {
      // Worker mode: leave both rows pending/processing for the local 8B render.
      console.log('[videos/create] worker mode — queue row pending for local Hunyuan 8B worker')
    } else {
      try {
        const { processVideoNow } = await import('@/lib/video-pipeline')
        await Promise.race([
          processVideoNow(video.id, topic),
          new Promise((res) => setTimeout(res, 35_000)),
        ])
      } catch (e: any) {
        console.warn('[videos/create] inline processing warn:', String(e?.message || e).slice(0, 120))
        // 35s elapsed without transition → heal pass (retry route or list route
        // auto-heal) will finish it; the row is at most minutes stale, never forever.
      }
    }

    // Log activity with credit info
    await prisma.activityLog.create({
      data: {
        customerId: authUser.id,
        action: 'video_created',
        description: `Created video: ${title} (cost: ${videoCost} credits, remaining: ${currentCredits - videoCost})`,
        metadata: JSON.stringify({ videoId: video.id, cost: videoCost, creditsRemaining: currentCredits - videoCost }),
      }
    })

    // Create credit transaction record
    // Audit ledger — non-fatal (CreditTransaction schema drift in some envs)
    await prisma.creditTransaction
      .create({
        data: {
          customerId: authUser.id,
          amount: -videoCost,
          type: 'video_generation',
          description: `Video generation: ${title}`,
          balanceAfter: currentCredits - videoCost,
        }
      })
      .catch((e) => console.warn('[videos/create] credit ledger skipped:', e?.message?.slice(0, 120)))

    return NextResponse.json({
      success: true,
      video: {
        id: video.id,
        title: video.title,
        status: video.status,
        creditsUsed: videoCost,
        creditsRemaining: currentCredits - videoCost,
      }
    })
  } catch (error) {
    console.error('Video creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}