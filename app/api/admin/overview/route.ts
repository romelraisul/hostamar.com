export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { executeWithFailover } from '@/lib/db-failover'

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

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
      }, { headers: corsHeaders() })
    }

    return NextResponse.json({
      ok: true,
      ...result.result,
      fallback: result.dbType,
    }, { headers: corsHeaders() })
  } catch (err: any) {
    const status = err?.cause?.status || err?.status || 500
    if (status === 401) {
      return NextResponse.json({ error: 'অনুমতি নেই: দয়া করে লগইন করুন' }, { status: 401, headers: corsHeaders() })
    }
    if (status === 403) {
      return NextResponse.json({ error: 'নিষিদ্ধ: অ্যাডমিন অ্যাক্সেস দরকার' }, { status: 403, headers: corsHeaders() })
    }
    console.error('[admin overview] error:', err)
    return NextResponse.json({
      ok: true,
      totalCustomers: 0,
      totalOrders: 0,
      totalRevenue: 0,
      pendingOrders: 0,
      fallback: 'error',
      warning: 'DB error - returned zeros',
    }, { status: 200, headers: corsHeaders() })
  }
}