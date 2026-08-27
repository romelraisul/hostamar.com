export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

const BACKEND_URL = process.env.API_BACKEND_URL || 'https://api.hostamar.com'

export async function GET(request: NextRequest) {
  const hasLocalDb = process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgresql://')

  if (hasLocalDb) {
    try {
      const token = request.cookies.get('auth_token')?.value

      if (!token) {
        return NextResponse.json(
          { error: 'Not authenticated' },
          { status: 401 }
        )
      }

      const payload = verifyToken(token)
      if (!payload) {
        return NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 401 }
        )
      }

      const user = await prisma.customer.findUnique({
        where: { id: payload.id }
      })
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
        },
      })
    } catch (error) {
      console.error('Local me error, falling back to proxy:', error)
      // Fall through to proxy below
    }
  }

  // Proxy to local backend
  try {
    const cookie = request.headers.get('cookie') || ''
    const resp = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json',
      },
    })
    const data = await resp.text()
    return new NextResponse(data, {
      status: resp.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Proxy me error:', error)
    return NextResponse.json(
      { error: 'Authentication service temporarily unavailable' },
      { status: 503 }
    )
  }
}
