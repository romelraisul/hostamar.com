import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'
import { prisma } from '@/lib/prisma'

const SYMBOLS = ['🍒', '🍋', '🍇', '🔔', '⭐', '💎']
const MIN_BET = 1
const MAX_BET = 100

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

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const bet = typeof body.bet === 'number' ? body.bet : 10
    const seed = typeof body.seed === 'number' ? body.seed : Date.now()

    if (!Number.isFinite(bet) || bet < MIN_BET || bet > MAX_BET) {
      return NextResponse.json({ success: false, error: `Bet must be between ${MIN_BET} and ${MAX_BET}` }, { status: 400 })
    }

    const customer = await prisma.customer.findUnique({
      where: { id: user.id },
      select: { credits: true, balance: true },
    })

    if (!customer) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 })
    }

    const credits = Number(customer.credits || 0)
    const balance = Number(customer.balance || 0)

    if (credits < bet) {
      return NextResponse.json({ success: false, error: 'Insufficient credits' }, { status: 400 })
    }

    const reels = spinReels(seed)
    const result = evaluateWin(reels, bet)

    const newCredits = Math.max(0, credits - bet + result.amount)
    let newBalance = balance
    if (result.won) {
      newBalance = balance + result.amount
    } else {
      newBalance = balance - bet
    }

    await prisma.customer.update({
      where: { id: user.id },
      data: {
        credits: newCredits,
        balance: newBalance,
      },
    })

    await prisma.activityLog.create({
      data: {
        customerId: user.id,
        action: result.won ? 'game_win' : 'game_loss',
        description: `Slot machine ${result.won ? 'won' : 'lost'} ${bet} credits — ${result.message}`,
        metadata: JSON.stringify({ bet, reels, multiplier: result.multiplier, amount: result.amount }),
      },
    })

    return NextResponse.json({
      success: true,
      reels,
      bet,
      ...result,
      credits: newCredits,
      balance: newBalance,
    })
  } catch (error) {
    console.error('Game spin error:', error)
    return NextResponse.json({ success: false, error: 'Failed to process spin' }, { status: 500 })
  }
}