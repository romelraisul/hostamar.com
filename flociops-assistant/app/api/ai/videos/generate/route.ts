import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { templateId, prompt, title } = await req.json().catch(() => ({}))

    if (!templateId || !prompt) {
      return NextResponse.json({ error: 'Template and prompt required' }, { status: 400 })
    }

    // Create video - status defaults to "processing" per Prisma schema, duration required
    const video = await prisma.video.create({
      data: {
        title: title || 'Untitled Video',
        prompt,
        templateId,
        duration: 30,
        customer: { connect: { id: session.user.id } },
      }
    })

    return NextResponse.json({
      success: true,
      videoId: video.id,
      status: 'PROCESSING'
    })
  } catch (error) {
    console.error('AI video generate error:', error)
    return NextResponse.json({ error: 'Failed to generate video' }, { status: 500 })
  }
}