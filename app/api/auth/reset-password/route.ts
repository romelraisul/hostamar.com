import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json()
    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Verify token
    let payload: any
    try {
      payload = jwt.verify(token, JWT_SECRET)
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
    }

    if (payload.purpose !== 'reset-password' || !payload.id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    // Find customer and verify token matches DB
    const customer = await prisma.customer.findUnique({
      where: { id: payload.id },
    })

    if (!customer || customer.resetToken !== token) {
      return NextResponse.json({ error: 'Token has already been used or is invalid' }, { status: 400 })
    }

    if (customer.resetTokenExpiry && customer.resetTokenExpiry < new Date()) {
      return NextResponse.json({ error: 'Token has expired' }, { status: 400 })
    }

    // Update password and clear reset token
    const hashedPassword = await bcrypt.hash(password, 12)
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    })

    return NextResponse.json({ success: true, message: 'Password has been reset successfully.' })
  } catch (error: any) {
    console.error('Reset password error:', error?.message || error)
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }
}
