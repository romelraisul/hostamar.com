import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-utils'
import { createSession } from '@/lib/collab'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await req.json()
    const { title, durationHours } = body

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const duration = durationHours ? Math.min(Math.max(Number(durationHours), 1), 24) : 2

    const session = createSession(user.id, title.trim(), duration)

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        code: session.code,
        host: session.host,
        title: session.title,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        participants: session.participants,
        status: session.status,
      },
    })
  } catch (error) {
    console.error('Failed to create collab session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
