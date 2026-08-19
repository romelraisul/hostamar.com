// PATCH /api/admin/customers/[id] — update customer fields
// POST /api/admin/customers/[id]/reset-password — reset customer password
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req)
    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        stage: true,
        credits: true,
        balance: true,
        score: true,
        notes: true,
        referralCode: true,
        referredBy: true,
        referralBonus: true,
        source: true,
        createdAt: true,
        updatedAt: true,
        emailVerified: true,
        _count: {
          select: {
            videos: true,
            services: true,
            subscriptions: true,
            payments: true,
            orders: true,
          },
        },
      },
    })
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    return NextResponse.json(customer)
  } catch (error: any) {
    const status = error?.cause?.status || 500
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req)
    const body = await req.json().catch(() => ({}))
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    const allowed: Record<string, any> = {}
    if (typeof body.role === 'string') allowed.role = body.role
    if (typeof body.credits === 'number') allowed.credits = body.credits
    if (typeof body.balance === 'number') allowed.balance = body.balance
    if (typeof body.score === 'number') allowed.score = body.score
    if (typeof body.stage === 'string') allowed.stage = body.stage
    if (typeof body.notes === 'string') allowed.notes = body.notes
    if (typeof body.phone === 'string') allowed.phone = body.phone

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
    }

    const updated = await prisma.customer.updateMany({
      where: { id: params.id },
      data: allowed,
    })

    if (updated.count === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, updatedCount: updated.count })
  } catch (error: any) {
    const status = error?.cause?.status || 500
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req)
    const body = await req.json().catch(() => ({}))
    const action = req.nextUrl.searchParams.get('action')

    if (action === 'reset-password') {
      const newPassword = typeof body?.password === 'string' && body.password.length >= 8
        ? body.password
        : undefined

      let finalPassword = newPassword
      if (!finalPassword) {
        const adjectives = ['Fast','Sharp','Bright','Bold','Clear','Cool','Deep','Dry','Easy','Fast']
        const nouns = ['Fox','Hawk','Lion','Bear','Wolf','Deer','Owl','Elk','Ape','Bee']
        const rand = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]
        const suffix = Math.floor(1000 + Math.random() * 9000)
        finalPassword = `${rand(adjectives)}${rand(nouns)}${suffix}!`
      }

      const hash = await bcrypt.hash(finalPassword, 10)
      const updated = await prisma.customer.updateMany({
        where: { id: params.id },
        data: { password: hash },
      })

      if (updated.count === 0) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
      }

      return NextResponse.json({ ok: true, password: finalPassword })
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  } catch (error: any) {
    const status = error?.cause?.status || 500
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status })
  }
}
