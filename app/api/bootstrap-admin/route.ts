export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    if (!body || typeof body !== 'object' || body.secret !== process.env.BOOTSTRAP_SECRET) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const { email, password, name } = body
    if (!email || !password || !name) {
      return NextResponse.json({ error: 'email, password, name required' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 10)

    let customerId: string | null = null
    let created = false

    try {
      const existing = await prisma.$queryRaw<any[]>`SELECT id, email, name, password, role FROM "Customer" WHERE email = ${email} LIMIT 1;`
      console.log('Existing user query result:', existing)
      if (existing[0]) {
        customerId = existing[0].id
        created = false
        // Promote to admin role if needed
        try {
          await prisma.$executeRaw`UPDATE "Customer" SET role = 'admin' WHERE id = ${customerId} AND role <> 'admin';`
        } catch (e) {
          console.error('Bootstrap role-update error:', e)
        }
      } else {
        const id = `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
        customerId = id
        created = true
        console.log('Inserting new customer with id:', id)
        await prisma.$executeRaw`INSERT INTO "Customer" (id, email, name, password, role, "emailVerified", "createdAt", "updatedAt") VALUES (${id}, ${email}, ${name}, ${hashed}, 'admin', NOW(), NOW(), NOW());`
        console.log('Insert completed')
      }
    } catch (rawError) {
      console.error('Bootstrap DB error:', rawError)
      if (rawError instanceof Error) {
        console.error('Error message:', rawError.message)
        console.error('Error code:', (rawError as any).code)
        console.error('Error meta:', (rawError as any).meta)
      }
      customerId = null
    }

    if (!customerId) {
      return NextResponse.json({ error: 'db_error', details: 'No customer ID' }, { status: 500 })
    }

    const role = created ? 'admin' : 'customer'
    const token = signToken({ id: customerId, email, name, role })

    const response = NextResponse.json({
      created,
      customer: { customerId, email, name, role },
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
    console.error('Bootstrap admin error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorCode = error instanceof Error ? (error as any).code : 'unknown'
    const errorMeta = error instanceof Error ? (error as any).meta : undefined
    return NextResponse.json({ 
      error: 'db_error', 
      details: errorMessage,
      code: errorCode,
      meta: errorMeta
    }, { status: 500 })
  }
}