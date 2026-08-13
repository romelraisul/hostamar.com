import { NextRequest, NextResponse } from 'next/server'
import * as bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { ensureTrial } from '@/lib/trial'
import { ensureFreeCredits } from '@/lib/credits'
import { signToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = body.email
    const password = body.password
    const name = body.name
    const businessName = body.businessName
    const industry = body.industry
    const betaCode = body.betaCode
    const phone = body.phone

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
        email: email,
        password: hashedPassword,
        name: name,
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

    await ensureTrial(customer.id)
    await ensureFreeCredits(customer.id, 6000)

    const token = signToken({
      id: customer.id,
      email: customer.email,
      name: customer.name,
      role: customer.role || 'customer',
    })

    const response = NextResponse.json({
      id: customer.id,
      email: customer.email,
      name: customer.name,
      business: customer.business,
      credits: 6000,
      token,
    })

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Signup error:', error)
    const message = error instanceof Error ? error.message : String(error)
    const code = error instanceof Error ? (error as any).code : 'unknown'
    const meta = error instanceof Error ? (error as any).meta : undefined
    const stack = error instanceof Error ? error.stack : undefined
    console.error('Signup error details:', { message, code, meta, stack })
    return NextResponse.json(
      { error: 'Internal server error', details: message, code },
      { status: 500 }
    )
  }
}
