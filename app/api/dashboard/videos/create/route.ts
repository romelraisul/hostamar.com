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
    })

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
    await prisma.creditTransaction.create({
      data: {
        customerId: authUser.id,
        amount: -videoCost,
        type: 'video_generation',
        description: `Video generation: ${title}`,
        balanceAfter: currentCredits - videoCost,
      }
    })

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