import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'
import { generateMarketingVideo, generateVideoScript, suggestVideoTopics } from '@/lib/video-generator'

// POST: Create new video generation request
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { templateId, prompt, title, topic } = body

    if (!templateId || !prompt) {
      return NextResponse.json({ error: 'Template and prompt required' }, { status: 400 })
    }

    // Check customer subscription
    const customer = await prisma.customer.findUnique({
      where: { id: session.user.id },
      include: { subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 } }
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Check video limit
    const subscription = customer.subscriptions?.[0]
    const currentMonthVideos = await prisma.video.count({
      where: {
        customerId: customer.id,
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
      }
    })

    const videoLimit = subscription?.videosPerMonth ?? 10
    if (currentMonthVideos >= videoLimit) {
      return NextResponse.json(
        { error: `আপনার ${videoLimit} ভিডিওর মাসিক সীমা শেষ হয়ে গেছে! পরবর্তী বিলিংয়ের জন্য অপেক্ষা করুন।`, limitReached: true },
        { status: 403 }
      )
    }

    // Create video record - status defaults to "processing"
    const video = await prisma.video.create({
      data: {
        title: title || 'Untitled Video',
        prompt,
        templateId,
        topic: topic || '',
        duration: 30,
        status: 'processing',
        customer: { connect: { id: customer.id } }
      }
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        customerId: customer.id,
        action: 'video_generation_started',
        description: `Video generation started: ${video.title}`,
        metadata: JSON.stringify({ templateId, prompt: prompt.substring(0, 100) })
      }
    })

    // Return immediately - processing happens asynchronously
    return NextResponse.json({
      success: true,
      videoId: video.id,
      status: 'processing',
      message: 'ভিডিও জেনারেট হচ্ছে! কয়েক মুহূর্ত অপেক্ষা করুন।',
      estimatedTime: '30-90 seconds'
    })
  } catch (error: any) {
    console.error('Video generation error:', error.message)
    return NextResponse.json(
      { error: 'ভিডিও জেনারেশনে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।' },
      { status: 500 }
    )
  }
}

// GET: List user's videos
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const where: any = { customerId: session.user.id }
    if (status) where.status = status

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.video.count({ where })
    ])

    return NextResponse.json({
      videos,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('Video list error:', error)
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 })
  }
}