import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

/**
 * POST /api/auth/reset-password
 * Body: { token, password }
 *
 * Looks up VerificationToken, validates it's for password reset (identifier=email),
 * updates Customer.passwordHash, and deletes the token (single-use).
 */
export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json()
    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 })
    }

    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Look up the token
    const vt = await prisma.verificationToken.findUnique({ where: { token } })
    if (!vt) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
    }

    if (vt.expires < new Date()) {
      // Lazy cleanup
      await prisma.verificationToken.delete({ where: { token } }).catch(() => {})
      return NextResponse.json({ error: 'Token has expired' }, { status: 400 })
    }

    const email = vt.identifier
    const customer = await prisma.customer.findUnique({ where: { email } })
    if (!customer) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    await prisma.$transaction([
      prisma.customer.update({
        where: { id: customer.id },
        data: { password: hashedPassword },
      }),
      prisma.verificationToken.delete({ where: { token } }),
    ])

    return NextResponse.json({ success: true, message: 'Password has been reset successfully.' })
  } catch (error: any) {
    console.error('Reset password error:', error?.message || error)
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }
}

/**
 * GET /api/auth/reset-password?token=...
 * Returns { valid: boolean, email?: string }
 * Used by /reset-password page to pre-validate before letting user type a new password.
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const token = url.searchParams.get('token')
    if (!token) {
      return NextResponse.json({ valid: false, error: 'Missing token' }, { status: 400 })
    }
    const vt = await prisma.verificationToken.findUnique({ where: { token } })
    if (!vt || vt.expires < new Date()) {
      return NextResponse.json({ valid: false, error: 'Invalid or expired token' }, { status: 400 })
    }
    return NextResponse.json({ valid: true, email: vt.identifier })
  } catch (error: any) {
    console.error('Reset password GET error:', error?.message || error)
    return NextResponse.json({ valid: false, error: 'Server error' }, { status: 500 })
  }
}
