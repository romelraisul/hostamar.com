import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

const RESET_TTL_MS = 60 * 60 * 1000 // 1 hour

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 *
 * Creates a VerificationToken row (identifier=email, token=randomhex, expires=now+1h)
 * and emails the user a reset link. Does NOT reveal whether the email exists.
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }
    const normalized = email.trim().toLowerCase()

    const customer = await prisma.customer.findUnique({ where: { email: normalized } })
    if (!customer) {
      return NextResponse.json({
        success: true,
        message: 'If the email exists, a reset link has been sent.',
      })
    }

    // Prune any prior tokens for this email to keep the table tight
    await prisma.verificationToken.deleteMany({
      where: { identifier: normalized },
    })

    const token = randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + RESET_TTL_MS)
    await prisma.verificationToken.create({
      data: { identifier: normalized, token, expires },
    })

    const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const resetUrl = `${appUrl}/reset-password?token=${token}`

    try {
      const { sendEmail } = require('@/lib/email')
      await sendEmail({
        to: normalized,
        subject: 'Reset your Hostamar password',
        html: `
          <h2>Password Reset</h2>
          <p>Click the link below to reset your password. This link expires in 1 hour.</p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:8px;">
            Reset Password
          </a>
          <p style="margin-top:16px;color:#666;">Or copy this URL: ${resetUrl}</p>
        `,
      })
    } catch {
      if (process.env.NODE_ENV === 'development') console.log('Password reset URL:', resetUrl)
    }

    return NextResponse.json({
      success: true,
      message: 'If the email exists, a reset link has been sent.',
      // Expose URL in dev only so user can test without SMTP
      resetUrl: process.env.NODE_ENV === 'development' ? resetUrl : undefined,
    })
  } catch (error: any) {
    console.error('Forgot password error:', error?.message || error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
