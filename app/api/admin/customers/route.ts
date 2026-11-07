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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const result = await executeWithFailover(async (client, dbType) => {
      if (dbType === 'turso') {
        const [customers, total] = await Promise.all([
          client.execute({
            sql: 'SELECT id, name, email, phone, role, stage, credits, balance, score, notes, referralCode, referredBy, referralBonus, source, "createdAt", "updatedAt", emailVerified FROM Customer ORDER BY "createdAt" DESC LIMIT ? OFFSET ?',
            args: [limit, skip],
          }),
          client.execute({ sql: 'SELECT COUNT(*) as cnt FROM Customer', args: [] }),
        ])
        return {
          customers: customers.rows.map((c: any) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            role: c.role,
            stage: c.stage,
            credits: Number(c.credits || 0),
            balance: Number(c.balance || 0),
            score: Number(c.score || 0),
            notes: c.notes,
            referralCode: c.referralCode,
            referredBy: c.referredBy,
            referralBonus: Number(c.referralBonus || 0),
            source: c.source,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
            emailVerified: c.emailVerified,
            _count: { videos: 0, services: 0, subscriptions: 0, payments: 0, orders: 0 },
          })),
          total: Number(total.rows[0]?.cnt || 0),
        }
      } else {
        const [customers, total] = await Promise.all([
          client.query('SELECT id, name, email, phone, role, stage, credits, balance, score, notes, "referralCode", "referredBy", "referralBonus", source, "createdAt", "updatedAt", "emailVerified" FROM "Customer" ORDER BY "createdAt" DESC LIMIT $1 OFFSET $2', [limit, skip]),
          client.query('SELECT COUNT(*) as cnt FROM "Customer"', []),
        ])
        return {
          customers: customers.rows.map((c: any) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            role: c.role,
            stage: c.stage,
            credits: Number(c.credits || 0),
            balance: Number(c.balance || 0),
            score: Number(c.score || 0),
            notes: c.notes,
            referralCode: c.referralCode,
            referredBy: c.referredBy,
            referralBonus: Number(c.referralBonus || 0),
            source: c.source,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
            emailVerified: c.emailVerified,
            _count: { videos: 0, services: 0, subscriptions: 0, payments: 0, orders: 0 },
          })),
          total: Number(total.rows[0]?.cnt || 0),
        }
      }
    })

    if (!result) {
      return NextResponse.json({
        ok: true,
        customers: [],
        pagination: { page, limit, total: 0, totalPages: 0, hasMore: false },
        fallback: 'none',
        warning: 'All databases unavailable',
      }, { headers: corsHeaders() })
    }

    const { customers, total } = result.result
    return NextResponse.json({
      ok: true,
      customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
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
    console.error('Admin customers fetch error:', error)
    return NextResponse.json({
      ok: true,
      customers: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasMore: false },
      fallback: 'error',
      warning: 'DB error - returned empty',
    }, { status: 200, headers: corsHeaders() })
  }
}