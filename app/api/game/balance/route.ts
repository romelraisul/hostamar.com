export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

const HEADER_KEYS = ['x-user-id', 'authorization', 'cookie'] as const
const DEFAULT_CREDITS = 1000
const DEFAULT_BALANCE = 1000

function extractCustomerId(req: NextRequest): string | null {
  for (const key of HEADER_KEYS) {
    const raw = req.headers.get(key)
    if (!raw) continue
    if (key === 'authorization' && raw.startsWith('Bearer ')) return raw.slice(7).trim() || null
    if (key === 'cookie') {
      const match = raw.match(/(?:^|;\s*)customerId=([^;\s]*)/)
      if (match?.[1]) return decodeURIComponent(match[1])
      continue
    }
    const trimmed = raw.trim()
    if (trimmed) return trimmed
  }
  return null
}

export async function GET(req: NextRequest) {
  try {
    const customerId = extractCustomerId(req)
    if (!customerId) {
      return NextResponse.json({ success: true, credits: DEFAULT_CREDITS, balance: DEFAULT_BALANCE, mode: 'demo', customerId: null })
    }

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
    const customerId = extractCustomerId(req)
    const body = await req.json().catch(() => ({}))
    const action = typeof body.action === 'string' ? body.action : null

    if (action === 'purchase') {
      const credits = typeof body.credits === 'number' && Number.isFinite(body.credits) ? Math.max(0, Math.trunc(body.credits)) : DEFAULT_CREDITS
      const balance = typeof body.balance === 'number' && Number.isFinite(body.balance) ? Math.max(0, body.balance) : DEFAULT_BALANCE
      if (!customerId) {
        return NextResponse.json({ success: true, credits, balance, mode: 'purchased', customerId: null })
      }

      await prisma.gameBalance.upsert({
        where: { customerId },
        update: { credits, balance, mode: 'purchased' },
        create: { customerId, credits, balance, mode: 'purchased' },
      }).catch(() => {})

      return NextResponse.json({ success: true, credits, balance, mode: 'purchased', customerId })
    }

    const targetCustomerId = customerId || '00000000-0000-0000-0000-000000000001'
    const record = await prisma.gameBalance.upsert({
      where: { customerId: targetCustomerId },
      update: { credits: DEFAULT_CREDITS, balance: DEFAULT_BALANCE, mode: 'demo' },
      create: { customerId: targetCustomerId, credits: DEFAULT_CREDITS, balance: DEFAULT_BALANCE, mode: 'demo' },
    }).catch(() => ({ credits: DEFAULT_CREDITS, balance: DEFAULT_BALANCE, customerId: targetCustomerId }))

    return NextResponse.json({
      success: true,
      credits: record.credits ?? DEFAULT_CREDITS,
      balance: record.balance ?? DEFAULT_BALANCE,
      mode: 'demo',
      customerId: record.customerId ?? targetCustomerId,
    })
  } catch (error) {
    return NextResponse.json({ success: true, credits: DEFAULT_CREDITS, balance: DEFAULT_BALANCE, mode: 'demo' }, { status: 200 })
  }
}