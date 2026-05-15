import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const customer = await prisma.customer.findUnique({
      where: { email: session.user.email },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const body = await request.json()
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