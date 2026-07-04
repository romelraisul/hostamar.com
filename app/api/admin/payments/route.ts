import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get('limit') || 100), 500)

    const dbConfigured = !!process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
    const fallback: any[] = []

    const payments = dbConfigured
      ? await prisma.payment.findMany({
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: {
            id: true,
            method: true,
            amount: true,
            currency: true,
            status: true,
            transactionId: true,
            createdAt: true,
          },
        }).catch(() => fallback)
      : fallback

    return NextResponse.json({ success: true, payments })
  } catch (error: any) {
    console.error('Admin payments fetch error:', error)
    const status = error?.cause?.status || 500
    return NextResponse.json({ success: false, payments: [], error: error?.message || 'Server error' }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()

    const dbConfigured = !!process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
    if (!dbConfigured) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 503 })
    }

    const payment = await prisma.payment.create({
      data: {
        customerId: body.customerId,
        method: body.method,
        amount: body.amount,
        currency: body.currency || 'BDT',
        status: body.status || 'pending',
        transactionId: body.transactionId || null,
        planName: body.planName || null,
      },
    })

    return NextResponse.json({ success: true, payment }, { status: 201 })
  } catch (error: any) {
    console.error('Admin payment create error:', error)
    const status = error?.cause?.status || 500
    return NextResponse.json({ success: false, error: error?.message || 'Internal server error' }, { status })
  }
}
