export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { executeWithFailover } from '@/lib/db-failover'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)

    const result = await executeWithFailover(async (client, dbType) => {
      if (dbType === 'turso') {
        const [customers, orders, revenue, pending] = await Promise.all([
          client.execute({ sql: 'SELECT COUNT(*) as cnt FROM Customer', args: [] }),
          client.execute({ sql: 'SELECT COUNT(*) as cnt FROM "Order"', args: [] }),
          client.execute({ sql: 'SELECT COALESCE(SUM(amount), 0) as total FROM Payment WHERE status = \'paid\'', args: [] }),
          client.execute({ sql: 'SELECT COUNT(*) as cnt FROM "Order" WHERE status = \'pending\'', args: [] }),
        ])
        return {
          totalCustomers: Number(customers.rows[0]?.cnt || 0),
          totalOrders: Number(orders.rows[0]?.cnt || 0),
          totalRevenue: Number(revenue.rows[0]?.total || 0),
          pendingOrders: Number(pending.rows[0]?.cnt || 0),
        }
      } else {
        const [customers, orders, revenue, pending] = await Promise.all([
          client.query('SELECT COUNT(*) as cnt FROM "Customer"', []),
          client.query('SELECT COUNT(*) as cnt FROM "Order"', []),
          client.query('SELECT COALESCE(SUM(amount), 0) as total FROM "Payment" WHERE status = \'paid\'', []),
          client.query('SELECT COUNT(*) as cnt FROM "Order" WHERE status = \'pending\'', []),
        ])
        return {
          totalCustomers: Number(customers.rows[0]?.cnt || 0),
          totalOrders: Number(orders.rows[0]?.cnt || 0),
          totalRevenue: Number(revenue.rows[0]?.total || 0),
          pendingOrders: Number(pending.rows[0]?.cnt || 0),
        }
      }
    })

    if (!result) {
      return NextResponse.json({
        ok: true,
        totalCustomers: 0,
        totalOrders: 0,
        totalRevenue: 0,
        pendingOrders: 0,
        fallback: 'none',
        warning: 'All databases unavailable',
      })
    }

    return NextResponse.json({
      ok: true,
      ...result,
      fallback: result.dbType,
    })
  } catch (err: any) {
    const status = err?.cause?.status || 500
    if (status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('[admin overview] error:', err)
    return NextResponse.json({
      ok: true,
      totalCustomers: 0,
      totalOrders: 0,
      totalRevenue: 0,
      pendingOrders: 0,
      fallback: 'error',
      warning: 'DB error - returned zeros',
    }, { status: 200 })
  }
}