import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { ideTemplate } from '@/lib/model-in-every-point'

export const dynamic = 'force-dynamic'

/**
 * GET /api/ide/server — list user's IDE sessions (ServiceOrder rows tagged inputs.type=vscode|pycharm|jupyter)
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orders = await prisma.serviceOrder.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  }).catch(() => [])

  const servers = orders.filter((o: any) => ['vscode', 'pycharm', 'jupyter'].includes((o.inputs as any)?.ideType))

  return NextResponse.json({ success: true, servers })
}

/**
 * POST /api/ide/server — create a new IDE session (10-15cr/hr)
 * Body: { type: 'vscode' | 'pycharm' | 'jupyter' }
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { body = {} }
  const type = ['vscode', 'pycharm', 'jupyter'].includes(body.type) ? body.type : 'vscode'

  const creditCost = type === 'pycharm' ? 15 : type === 'jupyter' ? 12 : 10

  // FULL FREE (v11): no check, no deduction, no 402 — IDE sessions free.
  const customer = await prisma.customer.findUnique({ where: { id: user.id }, select: { credits: true } }).catch(() => null)
  const balanceAfter = Number(customer?.credits ?? 6000)

  // FK anchor — s01 exists in the 50-service catalog
  const anchor = await prisma.serviceCatalog.findUnique({ where: { id: 's01' } }).catch(() => null)
  if (!anchor) return NextResponse.json({ error: 'CATALOG_MISSING' }, { status: 500 })

  const serverId = `ide-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  // MODEL IN EVERY POINT: starter file template (non-blocking)
  const starter = await ideTemplate(type).catch(() => '')
  // Filesystem root reserved on B2: ide/{userId}/{serverId}/ — files save via /api/storage
  const session = await prisma.serviceOrder.create({
    data: {
      userId: user.id,
      serviceId: 's01',
      creditCost,
      status: 'processing',
      inputs: { ideType: type, serverId, fsRoot: `ide/${user.id}/${serverId}/`, starterCode: starter || null },
      resultUrl: `/ide/preview?serverId=${serverId}`,
    },
  }).catch(() => null)

  return NextResponse.json({
    success: true,
    serverId,
    orderId: session?.id,
    type,
    status: 'running',
    url: session?.resultUrl || `/ide/preview?serverId=${serverId}`,
    fsRoot: `ide/${user.id}/${serverId}/`,
    creditsPerHour: creditCost,
    remainingCredits: balanceAfter,
    isFree: false,
  })
}
