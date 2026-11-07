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

    const { searchParams } = new URL(req.url)
    const take = Math.min(Number(searchParams.get('take')) || 50, 200)
    const source = searchParams.get('source')

    const result = await executeWithFailover(async (client, dbType) => {
      if (dbType === 'turso') {
        const [leads, total] = await Promise.all([
          client.execute({
            sql: `SELECT * FROM "Lead" ${source ? 'WHERE source = ?' : ''} ORDER BY "createdAt" DESC LIMIT ?`,
            args: source ? [source, take] : [take],
          }),
          client.execute({
            sql: `SELECT COUNT(*) as cnt FROM "Lead" ${source ? 'WHERE source = ?' : ''}`,
            args: source ? [source] : [],
          }),
        ])
        return {
          leads: leads.rows.map((l: any) => ({
            id: l.id,
            name: l.name,
            email: l.email,
            phone: l.phone,
            source: l.source,
            status: l.status,
            tags: l.tags,
            notes: l.notes,
            createdAt: l.createdAt,
          })),
          total: Number(total.rows[0]?.cnt || 0),
        }
      } else {
        const [leads, total] = await Promise.all([
          client.query(`SELECT * FROM "Lead" ${source ? 'WHERE source = $1' : ''} ORDER BY "createdAt" DESC LIMIT $${source ? 2 : 1}`, source ? [source, take] : [take]),
          client.query(`SELECT COUNT(*) as cnt FROM "Lead" ${source ? 'WHERE source = $1' : ''}`, source ? [source] : []),
        ])
        return {
          leads: leads.rows.map((l: any) => ({
            id: l.id,
            name: l.name,
            email: l.email,
            phone: l.phone,
            source: l.source,
            status: l.status,
            tags: l.tags,
            notes: l.notes,
            createdAt: l.createdAt,
          })),
          total: Number(total.rows[0]?.cnt || 0),
        }
      }
    })

    if (!result) {
      return NextResponse.json({
        ok: true,
        total: 0,
        count: 0,
        leads: [],
        fallback: 'none',
        warning: 'All databases unavailable',
      }, { headers: corsHeaders() })
    }

    const { leads, total } = result.result
    return NextResponse.json({
      ok: true,
      total,
      count: leads.length,
      leads,
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
    console.error('[admin leads] error:', err)
    return NextResponse.json({
      ok: true,
      total: 0,
      count: 0,
      leads: [],
      fallback: 'error',
      error: 'DB error - returned empty',
    }, { status: 200, headers: corsHeaders() })
  }
}