import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { activateService } from '@/lib/pinned-chat'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * POST /api/ai-services/activate — {serviceId, inputs}
 * → race-safe deduct → ServiceOrder(collecting_material) → pinned ServiceChat
 *   → first AI message asking missing materials → {orderId, chatId}
 * 402 + bKash when credits < cost.
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const serviceId = String(body.serviceId || '')
  if (!serviceId) return NextResponse.json({ error: 'serviceId required' }, { status: 400 })
  const inputs = (body.inputs && typeof body.inputs === 'object') ? body.inputs : {}

  const r = await activateService(user, serviceId, inputs)
  if (!r.ok) {
    if (r.status === 402) {
      return NextResponse.json({ error: 'INSUFFICIENT_CREDITS', bkash: '01822417463', topUp: '/dashboard/payment' }, { status: 402 })
    }
    return NextResponse.json({ error: r.error }, { status: r.status })
  }
  return NextResponse.json({ success: true, ...r })
}
