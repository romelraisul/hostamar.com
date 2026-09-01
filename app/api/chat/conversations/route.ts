export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'
import { prisma } from '@/lib/prisma'
import { ensureSchema } from '@/lib/ensure-schema'

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // V26: prod predates this table (schema has Conversation, prod DB may not).
    // Self-heal idempotently before the first query — non-fatal if it fails.
    await ensureSchema().catch(() => {})

    const conversations = await prisma.conversation.findMany({
      where: { userId: authUser.id },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    })

    return NextResponse.json({ conversations })
  } catch (error: any) {
    console.error('List conversations error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { title } = body as { title?: string }

    const conversation = await prisma.conversation.create({
      data: {
        userId: authUser.id,
        title: title || 'New conversation',
      },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    })

    return NextResponse.json({ conversation }, { status: 201 })
  } catch (error: any) {
    console.error('Create conversation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}