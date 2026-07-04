import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)

    const dbConfigured = !!process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
    const fallback: any[] = []

    const subscriptions = dbConfigured
      ? await prisma.subscription.findMany({
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            plan: true,
            status: true,
            price: true,
            currency: true,
            billingCycle: true,
            nextBillingDate: true,
            createdAt: true,
            customerId: true,
            customer: {
              select: { id: true, name: true, email: true },
            },
          },
        }).catch(() => fallback)
      : fallback

    return NextResponse.json({ success: true, subscriptions })
  } catch (error: any) {
    console.error('Admin subscriptions fetch error:', error)
    const status = error?.cause?.status || 500
    return NextResponse.json({ success: false, subscriptions: [], error: error?.message || 'Server error' }, { status })
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

    const subscription = await prisma.subscription.create({
      data: {
        customerId: body.customerId,
        plan: body.plan,
        status: body.status || 'active',
        price: body.price || 0,
        currency: body.currency || 'BDT',
        billingCycle: body.billingCycle || 'monthly',
        nextBillingDate: body.nextBillingDate ? new Date(body.nextBillingDate) : new Date(),
      },
    })

    return NextResponse.json({ success: true, subscription }, { status: 201 })
  } catch (error: any) {
    console.error('Admin subscription create error:', error)
    const status = error?.cause?.status || 500
    return NextResponse.json({ success: false, error: error?.message || 'Internal server error' }, { status })
  }
}
