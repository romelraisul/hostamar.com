import { NextResponse } from 'next/server'
import * as bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { ensureTrial } from '@/lib/trial'

export async function POST(request: Request) {
  try {
    console.log('Signup: Starting, prisma exists:', !!prisma)
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

    console.log('Signup: Checking existing customer')
        console.log('Signup: prisma object:', typeof prisma, !!prisma)
        console.log('Signup: prisma.customer:', typeof prisma.customer)
        const existingCustomer = await prisma.customer.findUnique({
          where: { email }
        })
        console.log('Signup: Existing customer check done:', !!existingCustomer)

    if (existingCustomer) {
      return NextResponse.json(
        { error: 'Customer already exists' },
        { status: 400 }
      )
    }

    console.log('Signup: Creating hashed password')
    const hashedPassword = await bcrypt.hash(password, 10)

    console.log('Signup: Creating customer')
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

    // Phase 0.1: every new customer gets an automatic 7-day free trial.
    // ensureTrial is idempotent so re-runs (e.g. signup retry) do nothing.
    await ensureTrial(customer.id)

    return NextResponse.json({
      id: customer.id,
      email: customer.email,
      name: customer.name,
      business: customer.business
    })
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