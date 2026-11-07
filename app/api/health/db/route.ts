import { NextResponse } from 'next/server'
import { getDBHealth, executeWithFailover } from '@/lib/db-failover'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const health = await getDBHealth()

    const connected = (health.turso === 'connected' || health.neon === 'connected' || health.supabase === 'connected' || health.local === 'connected')

    let testResult: any = null
    if (connected) {
      try {
        const result = await executeWithFailover(async (client, dbType) => {
          if (dbType === 'turso') {
            const res = await client.execute('SELECT 1 as test')
            return { dbType, rows: res.rows?.length || 0 }
          } else {
            const res = await client.query('SELECT 1 as test')
            return { dbType, rows: res.rows?.length || 0 }
          }
        })
        testResult = result
      } catch (e) {
        testResult = { error: String(e) }
      }
    }

    return NextResponse.json({
      ...health,
      testQuery: testResult,
      overall: connected ? 'up' : 'down',
      lightning: {
        tokenConfigured: Boolean(process.env.LIGHTNING_API_TOKEN),
        fleetIdConfigured: Boolean(process.env.LIGHTNING_FLEET_ID),
        spillEnabled: Boolean(process.env.LIGHTNING_API_TOKEN && process.env.LIGHTNING_FLEET_ID),
      },
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    return NextResponse.json({
      turso: 'error',
      neon: 'error',
      supabase: 'error',
      local: 'error',
      active: 'none',
      syncedAt: new Date().toISOString(),
      overall: 'down',
      error: String(e),
    }, { status: 503 })
  }
}