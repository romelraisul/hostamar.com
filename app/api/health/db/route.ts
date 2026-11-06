import { NextResponse } from 'next/server'
import { getDBHealth, executeWithFailover } from '@/lib/db-failover'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const health = await getDBHealth()

    // Test a simple query on the active DB
    let testResult: any = null
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

    return NextResponse.json({
      ...health,
      testQuery: testResult,
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    return NextResponse.json({
      turso: 'disconnected',
      neon: 'disconnected',
      supabase: 'disconnected',
      local: 'disconnected',
      active: 'none',
      syncedAt: new Date().toISOString(),
      error: String(e),
    }, { status: 503 })
  }
}