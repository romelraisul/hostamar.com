import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

const SYMBOLS = ['🍒', '🍋', '🍇', '🔔', '⭐', '💎']
const MIN_BET = 1
const MAX_BET = 100
const DEFAULT_CREDITS = 1000
const DEFAULT_BALANCE = 1000
const HEADER_KEYS = ['x-user-id', 'authorization', 'cookie'] as const

function seededRng(seed: number) {
  return function () {
    seed = (seed * 16807 + 0) % 2147483647
    return (seed - 1) / 2147483646
  }
}

function spinReels(seed: number) {
  const random = seededRng(seed)
  return Array.from({ length: 3 }, () => SYMBOLS[Math.floor(random() * SYMBOLS.length)])
}

function evaluateWin(reels: string[], bet: number): { won: boolean; multiplier: number; amount: number; message: string } {
  if (reels[0] === reels[1] && reels[1] === reels[2]) {
    const multiplier = reels[0] === '💎' ? 50 : reels[0] === '⭐' ? 25 : reels[0] === '🔔' ? 15 : 10
    const amount = bet * multiplier
    return { won: true, multiplier, amount, message: `Jackpot! ${reels[0]} x3 — Won ${amount} credits!` }
  }

  if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
    const matchSymbol = reels[0] === reels[1] ? reels[0] : reels[1] === reels[2] ? reels[1] : reels[0]
    const multiplier = matchSymbol === '🍇' ? 4 : matchSymbol === '🔔' ? 3 : 2
    const amount = bet * multiplier
    return { won: true, multiplier, amount, message: `Nice match! ${matchSymbol} x2 — Won ${amount} credits!` }
  }

  return { won: false, multiplier: 0, amount: 0, message: 'No luck this time. Try again!' }
}

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

export async function GET() {
  const credits = DEFAULT_CREDITS
  const balance = DEFAULT_BALANCE
  return NextResponse.json({ success: true, credits, balance, mode: 'demo' })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const bet = typeof body.bet === 'number' ? body.bet : 10
    const seed = typeof body.seed === 'number' ? body.seed : Date.now()

    if (!Number.isFinite(bet) || bet < MIN_BET || bet > MAX_BET) {
      return NextResponse.json({ success: false, credits: DEFAULT_CREDITS, balance: DEFAULT_BALANCE, error: `Bet must be between ${MIN_BET} and ${MAX_BET}` }, { status: 400 })
    }

    const customerId = extractCustomerId(req) || '00000000-0000-0000-0000-000000000001'
    let credits = DEFAULT_CREDITS
    let balance = DEFAULT_BALANCE
    let mode = 'demo'
    let balanceId = customerId

    try {
      const existing = await prisma.gameBalance.findUnique({ where: { customerId } }).catch(() => null)
      if (existing) {
        credits = existing.credits
        balance = existing.balance
        mode = 'pinned'
        balanceId = existing.customerId
      }
    } catch (dbError) {
      console.error('game spin balance lookup failed', dbError)
    }

    const reels = spinReels(seed)
    const result = evaluateWin(reels, bet)
    credits = Math.max(0, credits - bet + result.amount)
    if (result.won) {
      balance = balance + result.amount
    } else {
      balance = Math.max(0, balance - bet)
    }

    try {
      await prisma.gameBalance.upsert({
        where: { customerId },
        update: { credits, balance, mode: 'pinned' },
        create: { customerId, credits: DEFAULT_CREDITS, balance: DEFAULT_BALANCE, mode: 'fresh' },
      }).catch(() => {})

      await prisma.gameSpin.create({
        data: {
          balanceId,
          customerId,
          bet,
          reels,
          won: result.won,
          multiplier: result.multiplier,
          amount: result.amount,
          message: result.message,
        },
      }).catch(() => {})
    } catch (dbError) {
      console.error('game spin persistence failed', dbError)
    }

    return NextResponse.json({ success: true, reels, bet, ...result, credits, balance, mode, customerId })
  } catch (error) {
    return NextResponse.json({ success: true, credits: DEFAULT_CREDITS, balance: DEFAULT_BALANCE, error: 'Failed to process spin' }, { status: 200 })
  }
}
