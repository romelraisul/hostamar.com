import { NextResponse } from 'next/server'
import * as bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { ensureTrial } from '@/lib/trial'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, name, businessName, industry, betaCode, phone } = body

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // --- Beta-code gate (effective when the BetaInvite table is provisioned) ----
    // If betaCode is provided, look it up in BetaInvite; reject if invalid / expired / already USED.
    // If NO betaCode is provided AND the BetaInvite table has any rows, reject (gated mode).
    // If the BetaInvite table is empty/missing, allow free signup (open mode).
    let validatedInvite: any = null
    try {
      const totalInvites = await prisma.betaInvite.count()
      if (totalInvites > 0) {
        // gated mode — code is required
        if (!betaCode) {
          return NextResponse.json(
            { error: 'Beta access code required' },
            { status: 403 }
          )
        }
        const invite = await prisma.betaInvite.findUnique({ where: { code: betaCode } })
        if (!invite) {
          return NextResponse.json(
            { error: 'Invalid beta access code' },
            { status: 403 }
          )
        }
        if (invite.status === 'USED') {
          return NextResponse.json(
            { error: 'Beta access code already used' },
            { status: 403 }
          )
        }
        if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
          return NextResponse.json(
            { error: 'Beta access code expired' },
            { status: 403 }
          )
        }
        validatedInvite = invite
      }
    } catch {
      // BetaInvite table missing/corrupt — fall through to free signup (avoids hard 500s during infra drift)
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
        phone: phone || null,
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

    // Phase 0.1: every new customer gets an automatic 7-day free trial.
    // ensureTrial is idempotent so re-runs (e.g. signup retry) do nothing.
    await ensureTrial(customer.id)

    // --- Mark the beta invite as USED now that the customer (and trial) are created ---
    if (validatedInvite) {
      try {
        await prisma.betaInvite.update({
          where: { code: validatedInvite.code },
          data: {
            status: 'USED',
            usedAt: new Date(),
            email: email,      // record who consumed it
            name: name,
            phone: phone || null,
            updatedAt: new Date(),
          },
        })
      } catch (e) {
        // Non-fatal: the user already signed up; we just couldn't record the invite use.
        console.error('Failed to mark BetaInvite USED:', e)
      }
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

