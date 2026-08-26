import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/services/orders/[id] (auth)
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req)
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const id = params.id
  const order = await prisma.serviceOrder.findUnique({
    where: { id },
    include: { service: true },
  })
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }
  if (order.userId !== user.id) {
    // allow admin to view any order
    const customer = await prisma.customer.findUnique({ where: { id: user.id }, select: { role: true } })
    const role = (customer?.role || '').toLowerCase()
    if (role !== 'admin' && role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }
  return NextResponse.json({ success: true, order })
}
