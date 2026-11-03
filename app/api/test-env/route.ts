export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ? 'SET' : 'NOT SET',
  })
}
