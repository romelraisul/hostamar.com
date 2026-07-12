export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)

    const dbConfigured = !!process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
    const fallback: any[] = []

    const services = dbConfigured
      ? await prisma.service.findMany({
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            price: true,
            billingCycle: true,
            serverIp: true,
            serverId: true,
            expiresAt: true,
            createdAt: true,
            customerId: true,
            customer: {
              select: { id: true, name: true, email: true },
            },
          },
        }).catch(() => fallback)
      : fallback

    return NextResponse.json({ success: true, services })
  } catch (error: any) {
    console.error('Admin services fetch error:', error)
    const status = error?.cause?.status || 500
    return NextResponse.json({ success: false, services: [], error: error?.message || 'Server error' }, { status })
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

    const service = await prisma.service.create({
      data: {
        customerId: body.customerId,
        name: body.name,
        type: body.type,
        status: body.status || 'active',
        price: body.price || 0,
        billingCycle: body.billingCycle || 'monthly',
        serverIp: body.serverIp || null,
        serverId: body.serverId || null,
        credentials: body.credentials || '',
      },
    })

    return NextResponse.json({ success: true, service }, { status: 201 })
  } catch (error: any) {
    console.error('Admin service create error:', error)
    const status = error?.cause?.status || 500
    return NextResponse.json({ success: false, error: error?.message || 'Internal server error' }, { status })
  }
}