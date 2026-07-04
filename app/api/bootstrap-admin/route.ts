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
      const existing = await prisma.$queryRaw<any[]>`
        SELECT id, "customerId", email, name, password, "role"
        FROM "Customer"
        WHERE email = ${email}
        LIMIT 1;
      `
      if (existing[0]) {
        customerId = existing[0].customerId || existing[0].id
        created = false
      } else {
        const id = `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
        customerId = id
        created = true
        await prisma.$executeRaw`
          INSERT INTO "Customer" ("customerId", id, email, name, password, "role", "emailVerified", "createdAt", "updatedAt")
          VALUES (${id}, ${id}, ${email}, ${name}, ${hashed}, 'admin', NOW(), NOW());
        `
      }
    } catch (rawError) {
      console.error('Bootstrap DB error:', rawError)
      customerId = null
    }

    if (!customerId) {
      return NextResponse.json({ error: 'db_error' }, { status: 500 })
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
