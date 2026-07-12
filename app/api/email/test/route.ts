export const dynamic = 'force-dynamic'

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
      success: result?.success ?? false,
      fallback: result?.fallback ?? false,
      error: (result as any)?.error || undefined,
      message: result?.fallback
        ? 'SMTP not configured, email logged to console'
        : 'Test email sent successfully',
      devHint: process.env.NODE_ENV !== 'production' && !result?.success
        ? 'Brevo is blocking IP. Whitelist your IP at https://app.brevo.com/security/authorised_ips'
        : undefined,
    })
  } catch (error) {
    console.error('Test email error:', error)
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    )
  }
}