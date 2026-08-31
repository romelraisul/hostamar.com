export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdmin, getAuthUser } from '@/lib/auth'
import { env } from '@/lib/env'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)

    const { searchParams } = new URL(req.url)
    const limit = Math.min(Number(searchParams.get('limit') || 100), 500)

    const dbConfigured = !!env.DATABASE_URL && !env.DATABASE_URL.includes('localhost')
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

    // V18: admin listing of all payments leaves an audit trail (who saw the ledger)
    try {
      const admin = await getAuthUser(req)
      await prisma.activityLog.create({
        data: {
          customerId: admin?.id || 'unknown-admin',
          action: 'admin_payments_list',
          description: `Admin listed ${payments.length} payments (limit ${limit})`,
        },
      }).catch(() => {})
    } catch { /* audit non-fatal */ }
    return NextResponse.json({ success: true, payments })
  } catch (error: any) {
    console.error('Admin payments fetch error:', error)
    const status = error?.cause?.status || 500
    return NextResponse.json({ success: false, payments: [], error: error?.message || 'Server error' }, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)
    const body = await req.json()

    const dbConfigured = !!env.DATABASE_URL && !env.DATABASE_URL.includes('localhost')
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