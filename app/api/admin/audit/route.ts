import { NextResponse } from 'next/server'
export const dynamic='force-dynamic'
export async function GET(){
  return NextResponse.json({ status:'ok', audit:'hostamar admin audit', timestamp:new Date().toISOString() })
}

