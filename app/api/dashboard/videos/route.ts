export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'
import { withTenant, getOrgFromRequest } from '@/lib/tenancy/tenant'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request)
    const fallbackCustomerId = '00000000-0000-0000-0000-000000000001'
    if (!authUser) {
      const video = await prisma.video.findFirst({
        where: { customerId: fallbackCustomerId },
        select: { customerId: true },
      })
      if (!video && (await prisma.video.count()) === 0) {
        return NextResponse.json({ videos: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasMore: false } })
      }
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')))
    const skip = (page - 1) * limit
    const customerId = authUser?.id ?? fallbackCustomerId

    // PR d: tenant-scoped — resolve org, then scope by both customerId AND organizationId.
    let orgId: string | undefined
    try {
      orgId = await getOrgFromRequest(request, { customerId })
    } catch {
      orgId = undefined // fallbackCustomerId path / no membership: do not over-scope
    }

    const baseWhere = { customerId }
    const scopedWhere = orgId ? withTenant(orgId, { where: baseWhere }).where : baseWhere

    const [videos, videoCount] = await Promise.all([
      prisma.video.findMany({
        where: scopedWhere,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.video.count({ where: scopedWhere }),
    ])

    return NextResponse.json({
      videos,
      pagination: {
        page,
        limit,
        total: videoCount,
        totalPages: Math.ceil(videoCount / limit),
        hasMore: skip + limit < videoCount,
      },
    })
  } catch (error) {
    console.error('Videos fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request)

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('id')

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 })
    }

    // Verify the video belongs to this user + tenant
    const orgId = await getOrgFromRequest(request, { customerId: authUser.id }).catch(() => undefined)
    const where: any = { id: videoId, customerId: authUser.id }
    if (orgId) where.organizationId = orgId
    const video = await prisma.video.findFirst({ where })

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    // Delete related queue entries first
    await prisma.videoQueue.deleteMany({
      where: { videoId },
    })

    // Delete the video
    await prisma.video.delete({
      where: { id: videoId },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        customerId: authUser.id,
        action: 'video_deleted',
        description: `Deleted video: ${video.title}`,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Video deletion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
