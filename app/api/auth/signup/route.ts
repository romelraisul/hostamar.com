export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

// When running on Vercel (no local DB access), proxy to local backend via tunnel
const BACKEND_URL = process.env.API_BACKEND_URL || 'https://api.hostamar.com'

export async function POST(request: NextRequest) {
  const hasLocalDb = process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgresql://')

  if (hasLocalDb) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const bcrypt = (await import('bcryptjs')).default
      const { checkRateLimit, getClientIp, RATE_LIMITS } = await import('@/lib/rate-limit')
      const { sendWelcomeEmail } = await import('@/lib/email')
      const { WELCOME_CREDITS } = await import('@/lib/pricing')

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
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }

      const existingCustomer = await prisma.customer.findUnique({ where: { email } })
      if (existingCustomer) {
        return NextResponse.json({ error: 'Customer already exists' }, { status: 400 })
      }

      const hashedPassword = await bcrypt.hash(password, 10)
      const customer = await prisma.customer.create({
        data: {
          email,
          password: hashedPassword,
          name,
          // CRITICAL: 6000 FREE welcome credits at signup — enables all products.
          // (Audit-row note: prod CreditTransaction requires accountId (old shape),
          // so we skip the nested welcome_bonus row — same convention as
          // lib/credits.ts deductCredits legacy Customer.credits path.)
          credits: WELCOME_CREDITS,
          business: businessName ? {
            create: { name: businessName, industry: industry || 'Other' }
          } : undefined
        },
        include: { business: true }
      })

      if (refCode) {
        try {
          await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/referral`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refCode, newUserId: customer.id })
          })
        } catch {}
      }

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
      console.error('Signup local DB error, falling back to proxy:', error)
      // Fall through to proxy below
    }
  }

  // Proxy to local backend via Cloudflare tunnel (Vercel → api.hostamar.com → local Postgres)
  try {
    const body = await request.text()
    const resp = await fetch(`${BACKEND_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
    const data = await resp.text()
    return new NextResponse(data, {
      status: resp.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Signup proxy error:', error)
    return NextResponse.json(
      { error: 'Signup service temporarily unavailable. Please try again.' },
      { status: 503 }
    )
  }
}
