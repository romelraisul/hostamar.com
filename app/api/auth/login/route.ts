export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { comparePassword, signToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const rl = await checkRateLimit(ip, RATE_LIMITS.login, '/api/auth/login', 'POST')
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      )
    }

    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    let userRow: any = null
    try {
      userRow = await prisma.$queryRaw<any[]>`
        SELECT id, email, name, password, "role"
        FROM "Customer"
        WHERE email = ${email}
        LIMIT 1;
      `
    } catch (rawError) {
      console.error('Login raw query failed:', rawError)
    }

    if (!userRow?.[0]) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const user = userRow[0]
    let isValid = false
    try {
      isValid = await comparePassword(password, user.password)
    } catch (compareError) {
      console.error('Password compare failed:', compareError)
      isValid = bcrypt.compareSync(password, user.password)
    }

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'customer',
    })

    const response = NextResponse.json(
      {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        token,
      }
    )

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}