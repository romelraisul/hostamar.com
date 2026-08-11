import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    BKASH_NUMBER: process.env.BKASH_NUMBER || '(empty)',
    NAGAD_NUMBER: process.env.NAGAD_NUMBER || '(empty)',
    ROCKET_NUMBER: process.env.ROCKET_NUMBER || '(empty)',
    PERSONAL_USDT_ADDRESS: process.env.PERSONAL_USDT_ADDRESS || '(empty)',
    NODE_ENV: process.env.NODE_ENV,
  })
}
