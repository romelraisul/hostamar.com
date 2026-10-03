import { NextResponse } from 'next/server'
import { getFallbackStatus } from '@/lib/kilocode-client'
import { env } from '@/lib/env'
import { getTursoEdgeClient } from '@/lib/turso-edge'

export const dynamic = 'force-dynamic'

/**
 * GET /api/health — public liveness + REAL database connectivity.
 * Prisma/Neon is reachable from Vercel serverless (catalog, storage, TV all
 * use it in prod). The old "DB owned by dedicated backend" note was stale —
 * architecture moved back to direct Neon via DATABASE_URL.
 * Kept cheap: one SELECT 1 + one Customer.count().
 */
export async function GET() {
  let dbConnected = false
  let customers = 0
  try {
    const client = getTursoEdgeClient()
    await client.execute('SELECT 1')
    dbConnected = true
    const row = await client.execute('SELECT COUNT(*) AS total FROM Customer')
    customers = Number(row.rows[0]?.total ?? 0)
  } catch (e) {
    console.error('[health] db check failed:', e)
    dbConnected = false
  }

  const payload = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: {
      connected: dbConnected,
      customers,
    },
    environment: {
      nodeEnv: env.NODE_ENV,
      nextAuthUrl: env.NEXTAUTH_URL || 'not set',
      databaseUrlSet: Boolean(env.DATABASE_URL),
      apiBackend: env.NEXT_PUBLIC_API_URL || 'not set',
    },
    aiFallback: getFallbackStatus(),
    version: '1.0.1',
  }

  return NextResponse.json(payload, { status: 200 })
}
