export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { executeWithFailover } from '@/lib/db-failover'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const result = await executeWithFailover(async (client, dbType) => {
      if (dbType === 'turso') {
        const [users, total] = await Promise.all([
          client.execute({
            sql: 'SELECT id, name, email, role, "createdAt" FROM Customer ORDER BY "createdAt" DESC LIMIT ? OFFSET ?',
            args: [limit, skip],
          }),
          client.execute({
            sql: 'SELECT COUNT(*) as cnt FROM Customer',
            args: [],
          }),
        ])
        return {
          users: users.rows.map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            createdAt: u.createdAt,
          })),
          total: Number(total.rows[0]?.cnt || 0),
        }
      } else {
        const [users, total] = await Promise.all([
          client.query('SELECT id, name, email, role, "createdAt" FROM "Customer" ORDER BY "createdAt" DESC LIMIT $1 OFFSET $2', [limit, skip]),
          client.query('SELECT COUNT(*) as cnt FROM "Customer"', []),
        ])
        return {
          users: users.rows.map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            createdAt: u.createdAt,
          })),
          total: Number(total.rows[0]?.cnt || 0),
        }
      }
    })

    if (!result) {
      return NextResponse.json({
        ok: true,
        users: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
        fallback: 'none',
        warning: 'All databases unavailable',
      })
    }

    const { users, total } = result.result
    return NextResponse.json({
      ok: true,
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + limit < total,
      fallback: result.dbType,
    })
  } catch (err: any) {
    const status = err?.cause?.status || 500
    if (status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('[admin users] error:', err)
    return NextResponse.json({
      ok: true,
      users: [],
      total: 0,
      error: 'DB error - returned empty',
      fallback: 'error',
    }, { status: 200 })
  }
}