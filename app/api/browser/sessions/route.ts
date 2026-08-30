import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/browser/sessions — list user's AI Browser sessions (ServiceOrder type browser)
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sessions = await prisma.serviceOrder.findMany({
    where: { userId: user.id, serviceId: { contains: 'browser' } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  }).catch(() => [])
  return NextResponse.json({ success: true, sessions })
}

/**
 * POST /api/browser/sessions — create a new cloud browser session (5cr/hr)
 * Body: { type?: 'chrome' }
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { body = {} }
  const type = body.type || 'chrome'

  const CREDIT_PER_HOUR = 5

  // FULL FREE (v11): no check, no deduction, no 402 — browser sessions free.
  const customer = await prisma.customer.findUnique({ where: { id: user.id }, select: { credits: true } }).catch(() => null)
  const balanceAfter = Number(customer?.credits ?? 6000)

  const sessionId = `brs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

  // Store session as ServiceOrder (browser pseudo-service id — no FK to catalog)
  const session = await prisma.serviceOrder.create({
    data: {
      userId: user.id,
      serviceId: 'browser-cloud',
      creditCost: CREDIT_PER_HOUR,
      status: 'processing',
      inputs: { sessionId, type },
      resultUrl: `/dashboard/browser?session=${sessionId}`,
    },
  }).catch(() => null)

  return NextResponse.json({
    success: true,
    sessionId,
    orderId: session?.id,
    type,
    status: 'running',
    url: `/api/browser/proxy?url=${encodeURIComponent('https://www.google.com')}`,
    openUrl: `/dashboard/browser?session=${sessionId}`,
    creditsPerHour: CREDIT_PER_HOUR,
    remainingCredits: balanceAfter,
    isFree: false,
  })
}
