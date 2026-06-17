import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { password } = await request.json()
    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 })
    }

    const user = await prisma.customer.findUnique({
      where: { email: session.user.email }
    })

    if (!user || !user.password) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 403 })
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set('re-auth-token', Date.now().toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 600,
      path: '/',
    })

    return response
  } catch (error) {
    return NextResponse.json({ error: 'Re-authentication failed' }, { status: 500 })
  }
}