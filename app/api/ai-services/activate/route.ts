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
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status })
  // FULL FREE (v7): cost badges may still show the Fiverr-equivalent, but
  // activation never charges, never 402s.
  return NextResponse.json({ success: true, ...r, isFree: true, charged: 0 })
}
