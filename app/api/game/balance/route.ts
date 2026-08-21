export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import prisma from '@/lib/prisma'

const DEFAULT_CREDITS = 1000
const DEFAULT_BALANCE = 1000

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ success: true, credits: DEFAULT_CREDITS, balance: DEFAULT_BALANCE, mode: 'demo', customerId: null })
    }
    const customerId = authUser.id
    const balanceRecord = await prisma.gameBalance.findUnique({ where: { customerId } }).catch(() => null)
    if (balanceRecord) {
      return NextResponse.json({ success: true, credits: balanceRecord.credits, balance: balanceRecord.balance, mode: 'pinned', customerId })
    }
    return NextResponse.json({ success: true, credits: DEFAULT_CREDITS, balance: DEFAULT_BALANCE, mode: 'fresh', customerId })
  } catch (error) {
    return NextResponse.json({ success: true, credits: DEFAULT_CREDITS, balance: DEFAULT_BALANCE, mode: 'demo' }, { status: 200 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const customerId = authUser.id
    const body = await req.json().catch(() => ({}))
    const action = typeof body.action === 'string' ? body.action : null

    if (action === 'purchase') {
      const credits = typeof body.credits === 'number' && Number.isFinite(body.credits) ? Math.max(0, Math.trunc(body.credits)) : DEFAULT_CREDITS
      const balance = typeof body.balance === 'number' && Number.isFinite(body.balance) ? Math.max(0, body.balance) : DEFAULT_BALANCE
      await prisma.gameBalance.upsert({
        where: { customerId },
        update: { credits, balance, mode: 'purchased' },
        create: { customerId, credits, balance, mode: 'purchased' },
      }).catch(() => {})

      return NextResponse.json({ success: true, credits, balance, mode: 'purchased', customerId })
    }

    const record = await prisma.gameBalance.upsert({
      where: { customerId },
      update: { credits: DEFAULT_CREDITS, balance: DEFAULT_BALANCE, mode: 'demo' },
      create: { customerId, credits: DEFAULT_CREDITS, balance: DEFAULT_BALANCE, mode: 'demo' },
    }).catch(() => ({ credits: DEFAULT_CREDITS, balance: DEFAULT_BALANCE, customerId }))

    return NextResponse.json({
      success: true,
      credits: record.credits ?? DEFAULT_CREDITS,
      balance: record.balance ?? DEFAULT_BALANCE,
      mode: 'demo',
      customerId: record.customerId ?? customerId,
    })
  } catch (error) {
    return NextResponse.json({ success: true, credits: DEFAULT_CREDITS, balance: DEFAULT_BALANCE, mode: 'demo' }, { status: 200 })
  }
}
