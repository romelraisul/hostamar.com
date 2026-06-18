import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-utils'
import { joinSession } from '@/lib/collab'

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
    const { code } = body

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return NextResponse.json({ error: 'Session code is required' }, { status: 400 })
    }

    const session = joinSession(code.toUpperCase().trim(), user.id)

    if (!session) {
      return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 })
    }

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
    console.error('Failed to join collab session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
