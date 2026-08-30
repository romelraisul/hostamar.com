import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { gameConfig } from '@/lib/model-in-every-point'

export const dynamic = 'force-dynamic'

const GAMES = [
  { id: 'minecraft', name: 'Minecraft', icon: '⛏️', ram: '2GB', cpu: '1 vCPU', price: 20 },
  { id: 'cs2', name: 'CS2', icon: '🔫', ram: '4GB', cpu: '2 vCPU', price: 40 },
  { id: 'valorant', name: 'Valorant', icon: '🎯', ram: '4GB', cpu: '2 vCPU', price: 50 },
  { id: 'gta5', name: 'GTA V', icon: '🚗', ram: '8GB', cpu: '4 vCPU', price: 80 },
]

/**
 * GET /api/game — game catalog + user's game servers (ServiceOrder rows tagged game)
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orders = await prisma.serviceOrder.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  }).catch(() => [])

  // Game servers = orders whose inputs carry a gameId
  const servers = orders.filter((o: any) => (o.inputs as any)?.gameId)

  return NextResponse.json({ success: true, games: GAMES, servers })
}

/**
 * POST /api/game — start/stop a game server (credit charged per start: 20-80cr)
 * Body: { gameId, action: 'start' | 'stop' }
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { gameId = 'minecraft', action = 'start' } = body
  const game = GAMES.find(g => g.id === gameId) || GAMES[0]

  // An anchor catalog row for the FK (s01 always exists in the 50-service catalog)
  const anchor = await prisma.serviceCatalog.findUnique({ where: { id: 's01' } }).catch(() => null)
  if (!anchor) return NextResponse.json({ error: 'CATALOG_MISSING' }, { status: 500 })

  if (action === 'stop') {
    // Mark any running game order for this user+game delivered (stopped)
    const running = await prisma.serviceOrder.findMany({
      where: { userId: user.id, status: 'processing' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }).catch(() => [])
    for (const o of running) {
      if ((o.inputs as any)?.gameId === gameId) {
        await prisma.serviceOrder.update({ where: { id: o.id }, data: { status: 'delivered' } }).catch(() => {})
      }
    }
    return NextResponse.json({ success: true, gameId, status: 'stopped' })
  }

  const creditCost = game.price

  // STRICT CREDIT (v9): check → 402+bKash; race-safe deduct.
  const customer = await prisma.customer.findUnique({ where: { id: user.id }, select: { credits: true } }).catch(() => null)
  const balance = Number(customer?.credits ?? 0)
  if (balance < creditCost) {
    return NextResponse.json({ error: 'INSUFFICIENT_CREDITS', needed: creditCost, balance, bkash: '01822417463', topUp: '/dashboard/payment' }, { status: 402 })
  }
  const dec: any = await prisma.$executeRaw`UPDATE "Customer" SET credits = credits - ${creditCost} WHERE id = ${user.id} AND credits >= ${creditCost}`
  if (Number(dec) === 0) {
    return NextResponse.json({ error: 'INSUFFICIENT_CREDITS', needed: creditCost, balance, bkash: '01822417463', topUp: '/dashboard/payment' }, { status: 402 })
  }
  const after = await prisma.$queryRaw<any[]>`SELECT credits FROM "Customer" WHERE id = ${user.id} LIMIT 1`
  const balanceAfter = Number(after?.[0]?.credits ?? balance - creditCost)

  // MODEL IN EVERY POINT: LLM-generated server config (non-blocking)
  const config = await gameConfig(gameId, game.name)

  const server = await prisma.serviceOrder.create({
    data: {
      userId: user.id,
      serviceId: 's01', // FK anchor; real product context is in inputs.gameId
      creditCost,
      status: 'processing',
      inputs: { gameId, action, gameName: game.name, price: game.price, serverConfig: config || null },
      resultUrl: `/game/${gameId}`,
    },
  }).catch(() => null)

  return NextResponse.json({
    success: true,
    orderId: server?.id,
    gameId,
    gameName: game.name,
    status: 'running',
    url: `/game/${gameId}`,
    creditsPerHour: creditCost,
    remainingCredits: balanceAfter,
    isFree: false,
  })
}
