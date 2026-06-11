import { NextRequest, NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, name } = body

    if (!to || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      )
    }

    const result = await sendWelcomeEmail(to, name)

    return NextResponse.json({
      success: result.success,
      fallback: result.fallback,
      message: result.fallback
        ? 'SMTP not configured, email logged to console'
        : 'Test email sent successfully',
    })
  } catch (error) {
    console.error('Test email error:', error)
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    )
  }
}
