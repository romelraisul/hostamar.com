import { NextRequest, NextResponse } from 'next/server'

const DEMO_CUSTOMER_ID = '00000000-0000-0000-0000-000000000001'
const DEFAULT_CREDITS = 1000
const DEFAULT_BALANCE = 1000

export async function GET(req: NextRequest) {
  const customerId = req.headers.get('x-user-id') || req.headers.get('authorization')?.replace('Bearer ', '') || DEMO_CUSTOMER_ID

  return NextResponse.json({
    success: true,
    credits: DEFAULT_CREDITS,
    balance: DEFAULT_BALANCE,
    customerId,
    mode: 'demo',
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const action = typeof body.action === 'string' ? body.action : null

  if (action === 'reset') {
    return NextResponse.json({ success: true, credits: DEFAULT_CREDITS, balance: DEFAULT_BALANCE, mode: 'demo' })
  }

  return NextResponse.json({ success: true, credits: DEFAULT_CREDITS, balance: DEFAULT_BALANCE, mode: 'demo' })
}
