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

/**
 * GET /api/admin/transactions?status=pending_verification&limit=100
 *
 * Lists `Transaction` rows from the bKash personal flow that created via
 * `/api/payment/bkash-verify`. Distinct from `/api/admin/payments` which
 * only shows `Payment` rows. The admin UI calls this to surface
 * not-yet-approved TrxIDs so they can be flipped to completed via
 * `/api/admin/payments/approve/[transactionId]`.
 *
 * Query filters:
 *   - status: 'pending' | 'pending_verification' | 'completed' | 'failed' | 'all' (default 'pending_verification')
 *   - limit: 1..500 (default 100)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const statusFilter = String(searchParams.get('status') || 'pending_verification')
  const limit = Math.min(500, Math.max(1, Number(searchParams.get('limit') || 100)))

  try {
    await requireAdmin(req)

    const result = await executeWithFailover(async (client, dbType) => {
      const whereClause = statusFilter !== 'all' ? `WHERE status = ${dbType === 'turso' ? '?' : '$1'}` : ''
      const args = statusFilter !== 'all' ? [statusFilter] : []
      const limitArg = dbType === 'turso' ? '?' : `$${args.length + 1}`
      const finalArgs = [...args, limit]

      if (dbType === 'turso') {
        const transactions = await client.execute({
          sql: `SELECT t.*, c.email as "customerEmail", c.name as "customerName" FROM "Transaction" t LEFT JOIN Customer c ON t."customerId" = c.id ${whereClause} ORDER BY t."createdAt" DESC LIMIT ${limitArg}`,
          args: finalArgs,
        })
        return {
          transactions: transactions.rows.map((t: any) => ({
            id: t.id,
            customerId: t.customerId,
            customerEmail: t.customerEmail ?? null,
            customerName: t.customerName ?? null,
            amount: typeof t.amount === 'object' && t.amount !== null ? Number(t.amount) : Number(t.amount),
            currency: t.currency,
            status: t.status,
            gateway: t.gateway,
            gatewayTrxId: t.gatewayTrxId,
            videoPackage: t.videoPackage,
            creditsAdded: Number(t.creditsAdded || 0),
            createdAt: t.createdAt,
            approvePath: `/api/admin/payments/approve/${encodeURIComponent(t.id)}`,
          })),
        }
      } else {
        const transactions = await client.query(
          `SELECT t.*, c.email as "customerEmail", c.name as "customerName" FROM "Transaction" t LEFT JOIN "Customer" c ON t."customerId" = c.id ${whereClause} ORDER BY t."createdAt" DESC LIMIT ${limitArg}`,
          finalArgs
        )
        return {
          transactions: transactions.rows.map((t: any) => ({
            id: t.id,
            customerId: t.customerId,
            customerEmail: t.customerEmail ?? null,
            customerName: t.customerName ?? null,
            amount: typeof t.amount === 'object' && t.amount !== null ? Number(t.amount) : Number(t.amount),
            currency: t.currency,
            status: t.status,
            gateway: t.gateway,
            gatewayTrxId: t.gatewayTrxId,
            videoPackage: t.videoPackage,
            creditsAdded: Number(t.creditsAdded || 0),
            createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
            approvePath: `/api/admin/payments/approve/${encodeURIComponent(t.id)}`,
          })),
        }
      }
    })

    if (!result) {
      return NextResponse.json({
        ok: true,
        success: true,
        status: statusFilter,
        count: 0,
        transactions: [],
        fallback: 'none',
        warning: 'All databases unavailable',
      }, { headers: corsHeaders() })
    }

    return NextResponse.json({
      ok: true,
      success: true,
      status: statusFilter,
      count: result.result.transactions.length,
      transactions: result.result.transactions,
      fallback: result.dbType,
    }, { headers: corsHeaders() })
  } catch (error: any) {
    const status = error?.cause?.status || error?.status || 500
    if (status === 401) {
      return NextResponse.json({ error: 'অনুমতি নেই: দয়া করে লগইন করুন' }, { status: 401, headers: corsHeaders() })
    }
    if (status === 403) {
      return NextResponse.json({ error: 'নিষিদ্ধ: অ্যাডমিন অ্যাক্সেস দরকার' }, { status: 403, headers: corsHeaders() })
    }
    console.error('[admin transactions] error:', error)
    return NextResponse.json({
      ok: true,
      success: true,
      status: statusFilter,
      count: 0,
      transactions: [],
      fallback: 'error',
      warning: 'DB error - returned empty',
    }, { status: 200, headers: corsHeaders() })
  }
}