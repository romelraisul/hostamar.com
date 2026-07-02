import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'
import { prisma } from '@/lib/prisma'

type MessageType = {
  id: string
  role: string
  content: string
  model?: string | null
  createdAt: string
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUser(_request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const conversation = await prisma.conversation.findFirst({
      where: { id: params.id, userId: authUser.id },
      select: { id: true },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: params.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, role: true, content: true, model: true, createdAt: true },
    })

    const formatted = messages.map((m) => ({
      id: m.id,
      role: m.role.toLowerCase(),
      content: m.content,
      model: m.model,
      createdAt: m.createdAt.toISOString(),
    }))

    return NextResponse.json({ messages: formatted })
  } catch (error: any) {
    console.error('List messages error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUser(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { content, role = 'user', model } = body as {
      content?: string
      role?: string
      model?: string | null
    }

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const conversation = await prisma.conversation.findFirst({
      where: { id: params.id, userId: authUser.id },
      select: { id: true },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const messageData = await prisma.message.create({
      data: {
        conversationId: params.id,
        userId: authUser.id,
        role,
        content,
        model,
      } as any,
    })

    return NextResponse.json(
      {
        message: {
          id: messageData.id,
          role: messageData.role.toLowerCase(),
          content: messageData.content,
          model: messageData.model,
          createdAt: messageData.createdAt.toISOString(),
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Create message error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUser(_request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await _request.json().catch(() => ({}))
    const { before } = body as { before?: string }

    const conversation = await prisma.conversation.findFirst({
      where: { id: params.id, userId: authUser.id },
      select: { id: true },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const where: any = { conversationId: params.id }
    if (before) {
      where.createdAt = { gt: new Date(before) }
    }

    const result = await prisma.message.deleteMany({ where })

    return NextResponse.json({ deleted: result.count })
  } catch (error: any) {
    console.error('Delete messages error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
