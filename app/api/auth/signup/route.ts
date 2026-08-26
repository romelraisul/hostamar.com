export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { WELCOME_CREDITS } from '@/lib/pricing'
import { verifyTurnstile } from '@/lib/turnstile'
import * as bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { sendWelcomeEmail } from '@/lib/email'
import { env } from '@/lib/env'

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

    // Bot check — protects the 6000 welcome credits from scripted farming.
    if (!(await verifyTurnstile(body.turnstileToken))) {
      return NextResponse.json({ error: 'Bot check failed' }, { status: 400 })
    }

    const customer = await prisma.customer.create({
      data: {
        email,
        password: hashedPassword,
        name,
        credits: WELCOME_CREDITS, // free credit pool granted at signup
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

    // NEW (2026-08-26): Create CreditAccount + audit row for EVERY new signup.
    // The legacy Customer.credits column is kept for backward compat but the
    // CreditAccount is the real source of truth — lib/credits.ts checks it first.
    const acctRes: any = await prisma.$executeRaw`INSERT INTO "CreditAccount" (id, "customerId", credits) VALUES (gen_random_uuid()::text, ${customer.id}, ${WELCOME_CREDITS})`
    const acctRows: any = await prisma.$queryRaw`SELECT id FROM "CreditAccount" WHERE "customerId" = ${customer.id} LIMIT 1`
    const creditAccount = { id: acctRows[0]?.id }
    await prisma.$executeRaw`INSERT INTO "CreditTransaction" (id, "accountId", amount, product, "balanceAfter", description)
      VALUES (gen_random_uuid()::text, ${creditAccount.id}, ${WELCOME_CREDITS}, 'welcome_bonus', ${WELCOME_CREDITS}, 'Signup welcome credits — 6000 Taka ≈ $47 USD')`.catch(() => null)

    // Audit row against the REAL prod table shape (accountId→CreditAccount);
    // best-effort — skipped when the customer has no CreditAccount yet.
    try {
      const acct = await prisma.$queryRaw`SELECT id FROM "CreditAccount" WHERE "customerId" = ${customer.id} LIMIT 1`
      if (Array.isArray(acct) && acct[0]) {
        await prisma.$executeRaw`INSERT INTO "CreditTransaction" (id, "accountId", amount, product, "balanceAfter", description)
          VALUES (gen_random_uuid()::text, ${acct[0].id}, ${WELCOME_CREDITS}, 'welcome_bonus', ${WELCOME_CREDITS}, 'Signup welcome credits')`
      }
    } catch { /* best-effort */ } // audit trail is best-effort — never block signup

    // Referral viral: create Referral with bonusAmount 60 (starter) status pending
    // Supports 6-char code via Customer.referralCode (new) and legacy HST* codes
    const effectiveRef = (refCode || (request as any).headers?.get?.('x-ref-code') || '').toString().trim().toUpperCase()
    // also check cookie affiliate_ref
    let cookieRef = ''
    try { cookieRef = (request.cookies.get('affiliate_ref')?.value || '').toUpperCase() } catch {}
    const finalRef = (effectiveRef || cookieRef || '').trim().toUpperCase()
    if (finalRef) {
      try {
        const referrer = await prisma.customer.findFirst({ where: { referralCode: finalRef } })
        if (referrer && referrer.id !== customer.id) {
          const exists = await prisma.referral.findFirst({ where: { referrerId: referrer.id, referredId: customer.id } })
          if (!exists) {
            await prisma.referral.create({
              data: { referrerId: referrer.id, referredId: customer.id, status: 'pending', bonusAmount: 60 },
            })
          }
        }
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