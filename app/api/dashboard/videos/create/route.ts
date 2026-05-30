import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, topic, description, language = 'bn' } = body

    if (!title || !topic) {
      return NextResponse.json({ error: 'Title and topic are required' }, { status: 400 })
    }

    // Get active subscription to check limits
    const subscription = await prisma.subscription.findFirst({
      where: { 
        customerId: authUser.id,
        status: 'active',
      },
    })

    const videosPerMonth = subscription?.videosPerMonth || 10
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const videosThisMonth = await prisma.video.count({
      where: {
        customerId: authUser.id,
        createdAt: { gte: startOfMonth },
      },
    })

    if (videosThisMonth >= videosPerMonth) {
      return NextResponse.json({ 
        error: `Monthly video limit reached (${videosPerMonth} videos). Upgrade your plan for more.` 
      }, { status: 403 })
    }

    // Create video entry
    const video = await prisma.video.create({
      data: {
        customerId: authUser.id,
        title,
        topic,
        description: description || null,
        script: '',
        duration: 60,
        format: 'mp4',
        resolution: '1080p',
        language,
        status: 'processing',
        url: '',
        fileSize: 0,
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
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        customerId: authUser.id,
        action: 'video_created',
        description: `Created video: ${title}`,
      },
    })

    return NextResponse.json({ 
      success: true, 
      video: {
        id: video.id,
        title: video.title,
        status: video.status,
      }
    })
  } catch (error) {
    console.error('Video creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
