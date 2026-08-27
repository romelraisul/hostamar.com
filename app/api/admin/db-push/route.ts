import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const secret = req.headers.get('x-bootstrap-secret') || req.nextUrl.searchParams.get('secret')
    if (!secret || secret !== process.env.BOOTSTRAP_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if table exists
    const exists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'SsoState'
      ) as exists
    `

    if (exists[0]?.exists) {
      return NextResponse.json({ success: true, message: 'SsoState table already exists' })
    }

    // Create table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "SsoState" (
        id          TEXT PRIMARY KEY,
        state       TEXT NOT NULL UNIQUE,
        nonce       TEXT,
        mode        TEXT NOT NULL DEFAULT 'login',
        "customerId" TEXT,
        "expiresAt" TIMESTAMP NOT NULL,
        "consumedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `)

    await prisma.$executeRawUnsafe(`CREATE INDEX "SsoState_state_idx" ON "SsoState" (state)`)
    await prisma.$executeRawUnsafe(`CREATE INDEX "SsoState_expiresAt_idx" ON "SsoState" ("expiresAt")`)

    return NextResponse.json({ success: true, message: 'SsoState table created' })
  } catch (error: any) {
    console.error('Bootstrap error:', error)
    return NextResponse.json({ error: error?.message || 'Bootstrap failed' }, { status: 500 })
  }
}
