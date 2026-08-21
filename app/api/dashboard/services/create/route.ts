export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const customer = await prisma.customer.findUnique({
      where: { email: authUser.email },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const body = await req.json()
    const { type, name, specs, price, billingCycle = 'monthly' } = body

    if (!type || !name || !price) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Calculate expiry date
    const expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + 1)

    // Create service (status will be 'pending' until admin approves)
    const service = await prisma.service.create({
      data: {
        customerId: customer.id,
        type,
        name,
        specs: specs || '{}',
        credentials: '',
        price,
        billingCycle,
        status: 'pending', // Pending approval
        expiresAt,
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        customerId: customer.id,
        action: 'service_created',
        description: `Ordered ${type}: ${name} - ৳${price}`,
      },
    })

    return NextResponse.json({ 
      success: true, 
      service: {
        id: service.id,
        name: service.name,
        status: service.status,
      }
    })
  } catch (error) {
    console.error('Service creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}