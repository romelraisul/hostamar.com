import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/services/orders?limit=20 — user's service orders
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

/**
 * POST /api/services/orders — create new service order (hosting/vps/rdp/game/ide/browser/video)
 * Body: { type, plan, location, trxId, senderNumber }
 * Creates: Transaction (pending_verification) + Notification (নতুন bKash)
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { type = 'vps', plan = 'starter', location = 'bd', trxId = '', senderNumber = '' } = body

  const planPrices: Record<string, number> = { starter: 599, pro: 1299, business: 2999 }
  const amount = planPrices[plan] || 599

  // Create Transaction pending_verification
  const tx = await prisma.transaction.create({
    data: {
      customerId: user.id,
      amount,
      currency: 'BDT',
      status: 'pending_verification',
      gateway: 'bkash',
      gatewayTrxId: trxId || null,
    },
  })

  // Create Notification
  await prisma.notification.create({
    data: {
      customerId: user.id,
      type: 'payment',
      title: 'নতুন bKash পেমেন্ট পেয়েছি',
      message: `TrxID: ${trxId || 'N/A'} • ৳${amount} • ${type}/${plan} • যাচাই হচ্ছে...`,
      actionUrl: '/admin/payments',
      read: false,
    },
  })

  return NextResponse.json({
    success: true,
    message: 'অর্ডার সফলভাবে জমা হয়েছে — যাচাইের পর অ্যাক্টিভ হবে',
    transaction: { id: tx.id, amount: tx.amount, status: tx.status, gateway: tx.gateway },
  })
}
