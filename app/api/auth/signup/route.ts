import { NextResponse } from 'next/server'
import * as bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { sendWelcomeEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const rl = await checkRateLimit(ip, RATE_LIMITS.signup, '/api/auth/signup', 'POST')
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many signup attempts from this address. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { email, password, name, businessName, industry, inviteCode, refCode } = body

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const existingCustomer = await prisma.customer.findUnique({
      where: { email }
    })

    if (existingCustomer) {
      return NextResponse.json(
        { error: 'Customer already exists' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const customer = await prisma.customer.create({
      data: {
        email,
        password: hashedPassword,
        name,
        business: businessName ? {
          create: {
            name: businessName,
            industry: industry || 'Other',
          }
        } : undefined
      },
      include: {
        business: true
      }
    })


    // Track referral if ref code provided
    if (refCode) {
      try {
        await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/referral`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refCode, newUserId: customer.id })
        });
      } catch { /* referral tracking is non-critical */ }
    }

    // Consume beta invite code if provided
    if (inviteCode) {
      const invite = await prisma.betaInvite.findUnique({
        where: { code: String(inviteCode).trim().toUpperCase() }
      })
      if (invite && invite.status === 'PENDING' && invite.email === email) {
        await prisma.betaInvite.update({
          where: { id: invite.id },
          data: { status: 'USED', usedAt: new Date() }
        })
      }
    }

    // Send welcome email — fails gracefully (SMTP may be unset)
    try {
      await sendWelcomeEmail(customer.email, customer.name || customer.email.split('@')[0])
    } catch (emailError) {
      console.warn('[Signup] Welcome email failed:', emailError)
    }

    return NextResponse.json({
      id: customer.id,
      email: customer.email,
      name: customer.name,
      business: customer.business
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
