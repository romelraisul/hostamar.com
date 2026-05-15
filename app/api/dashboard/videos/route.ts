import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import prisma from '@/lib/prisma'

export async function GET() {
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

    const videos = await prisma.video.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ videos })
  } catch (error) {
    console.error('Videos fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}