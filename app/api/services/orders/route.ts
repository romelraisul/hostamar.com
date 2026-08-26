import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/services/orders?limit=20 (auth, user's orders)
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10) || 20, 1), 100)

  const orders = await prisma.serviceOrder.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { service: true },
  })

  return NextResponse.json({ success: true, total: orders.length, orders })
}
