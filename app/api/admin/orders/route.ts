import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)

    const { searchParams } = new URL(req.url)
    const limit = Math.min(Number(searchParams.get('limit') || 100), 500)

    const dbConfigured = !!process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
    const fallback: any[] = []

    const orders = dbConfigured
      ? await prisma.order.findMany({
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: {
            id: true,
            plan: true,
            amount: true,
            status: true,
            currency: true,
            createdAt: true,
            customer: {
              select: { id: true, name: true, email: true },
            },
          },
        }).catch(() => fallback)
      : fallback

    return NextResponse.json({ success: true, orders })
  } catch (error: any) {
    console.error('Admin orders fetch error:', error)
    const status = error?.cause?.status || 500
    return NextResponse.json({ success: false, orders: [], error: error?.message || 'Server error' }, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)
    const body = await req.json()

    const dbConfigured = !!process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
    if (!dbConfigured) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 503 })
    }

    const order = await prisma.order.create({
      data: {
        customerId: body.customerId,
        plan: body.plan,
        amount: body.amount,
        status: body.status || 'pending',
        currency: body.currency || 'BDT',
      },
    })

    return NextResponse.json({ success: true, order }, { status: 201 })
  } catch (error: any) {
    console.error('Admin order create error:', error)
    const status = error?.cause?.status || 500
    return NextResponse.json({ success: false, error: error?.message || 'Internal server error' }, { status })
  }
}
