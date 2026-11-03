export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ error: 'NextAuth disabled on Workers, use /api/auth/login' }, { status: 501 })
}

export async function POST() {
  return NextResponse.json({ error: 'NextAuth disabled on Workers, use /api/auth/login' }, { status: 501 })
}
