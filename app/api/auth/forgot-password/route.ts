import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const customer = await prisma.customer.findUnique({ where: { email } })
    if (!customer) {
      // Don't reveal whether email exists
      return NextResponse.json({ success: true, message: 'If the email exists, a reset link has been sent.' })
    }

    // Generate reset token (1-hour expiry)
    const resetToken = jwt.sign(
      { id: customer.id, purpose: 'reset-password' },
      JWT_SECRET,
      { expiresIn: '1h' }
    )

    const resetTokenExpiry = new Date(Date.now() + 3600000)
    await prisma.customer.update({
      where: { id: customer.id },
      data: { resetToken, resetTokenExpiry },
    })

    // Try to send email via nodemailer
    const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const resetUrl = `${appUrl}/reset-password?token=${resetToken}`

    try {
      const { sendEmail } = require('@/lib/email')
      await sendEmail({
        to: email,
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
      // Email may not be configured — log reset URL for development
      console.log('Password reset URL:', resetUrl)
    }

    return NextResponse.json({ success: true, message: 'If the email exists, a reset link has been sent.', resetUrl: process.env.NODE_ENV === 'development' ? resetUrl : undefined })
  } catch (error: any) {
    console.error('Forgot password error:', error?.message || error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
