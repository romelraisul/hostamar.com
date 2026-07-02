import { NextRequest, NextResponse } from 'next/server'

const SYMBOLS = ['🍒', '🍋', '🍇', '🔔', '⭐', '💎']
const MIN_BET = 1
const MAX_BET = 100
const DEFAULT_CREDITS = 1000
const DEFAULT_BALANCE = 1000

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

export async function GET(req: NextRequest) {
  try {
    const credits = DEFAULT_CREDITS
    const balance = DEFAULT_BALANCE
    return NextResponse.json({ success: true, credits, balance, mode: 'demo' })
  } catch (error) {
    return NextResponse.json({ success: true, credits: DEFAULT_CREDITS, balance: DEFAULT_BALANCE }, { status: 200 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const bet = typeof body.bet === 'number' ? body.bet : 10
    const seed = typeof body.seed === 'number' ? body.seed : Date.now()

    if (!Number.isFinite(bet) || bet < MIN_BET || bet > MAX_BET) {
      return NextResponse.json({ success: false, credits: DEFAULT_CREDITS, balance: DEFAULT_BALANCE, error: `Bet must be between ${MIN_BET} and ${MAX_BET}` }, { status: 400 })
    }

    const reels = spinReels(seed)
    const result = evaluateWin(reels, bet)

    const credits = Math.max(0, DEFAULT_CREDITS - bet + result.amount)
    let balance = DEFAULT_BALANCE
    if (result.won) {
      balance = DEFAULT_BALANCE + result.amount
    } else {
      balance = DEFAULT_BALANCE - bet
    }

    if (!result.won) {
      balance = Math.max(0, balance)
    }

    return NextResponse.json({ success: true, reels, bet, ...result, credits, balance, mode: 'demo' })
  } catch (error) {
    return NextResponse.json({ success: true, credits: DEFAULT_CREDITS, balance: DEFAULT_BALANCE, error: 'Failed to process spin' }, { status: 200 })
  }
}
