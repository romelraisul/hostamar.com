// PATCH /api/admin/customers/[id] — update customer fields
// POST /api/admin/customers/[id]/reset-password — reset customer password
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { executeWithFailover } from '@/lib/db-failover'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req)

    const result = await executeWithFailover(async (client, dbType) => {
      if (dbType === 'turso') {
        const customer = await client.execute({
          sql: 'SELECT id, name, email, phone, role, stage, credits, balance, score, notes, "referralCode", "referredBy", "referralBonus", source, "createdAt", "updatedAt", "emailVerified" FROM Customer WHERE id = ?',
          args: [params.id],
        })
        if (!customer.rows.length) return null
        const c = customer.rows[0]
        return {
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
        }
      } else {
        const customer = await client.query(
          'SELECT id, name, email, phone, role, stage, credits, balance, score, notes, "referralCode", "referredBy", "referralBonus", source, "createdAt", "updatedAt", "emailVerified" FROM "Customer" WHERE id = $1',
          [params.id]
        )
        if (!customer.rows.length) return null
        const c = customer.rows[0]
        return {
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
        }
      }
    })

    if (!result || !result.result) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json({ ...result.result, fallback: result.dbType })
  } catch (error: any) {
    const status = error?.cause?.status || 500
    if (status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('[admin customers/[id]] error:', error)
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req)
    const body = await req.json().catch(() => ({}))
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    const allowed: Record<string, any> = {}
    if (typeof body.role === 'string') allowed.role = body.role
    if (typeof body.credits === 'number') allowed.credits = body.credits
    if (typeof body.balance === 'number') allowed.balance = body.balance
    if (typeof body.score === 'number') allowed.score = body.score
    if (typeof body.stage === 'string') allowed.stage = body.stage
    if (typeof body.notes === 'string') allowed.notes = body.notes
    if (typeof body.phone === 'string') allowed.phone = body.phone

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
    }

    const setClause = Object.keys(allowed).map((k, i) => `"${k}" = ${i === 0 ? '?' : '$' + (i + 1)}`).join(', ')
    const values = Object.values(allowed)

    const result = await executeWithFailover(async (client, dbType) => {
      if (dbType === 'turso') {
        await client.execute({
          sql: `UPDATE Customer SET ${setClause} WHERE id = ?`,
          args: [...values, params.id],
        })
      } else {
        await client.query(`UPDATE "Customer" SET ${setClause.replace(/\?/g, (_, i) => '$' + (i + 1))} WHERE id = $${values.length + 1}`, [...values, params.id])
      }
      return { updated: true }
    })

    if (!result) {
      return NextResponse.json({ ok: true, updatedCount: 0, fallback: 'error', warning: 'DB error - update may not have persisted' })
    }

    return NextResponse.json({ ok: true, updatedCount: 1, fallback: result.dbType })
  } catch (error: any) {
    const status = error?.cause?.status || 500
    if (status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('[admin customers/[id] PATCH] error:', error)
    return NextResponse.json({ ok: true, updatedCount: 0, fallback: 'error', warning: 'DB error - update may not have persisted' }, { status: 200 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let finalPassword: string | undefined

  try {
    await requireAdmin(req)
    const body = await req.json().catch(() => ({}))
    const action = req.nextUrl.searchParams.get('action')

    if (action === 'reset-password') {
      const newPassword = typeof body?.password === 'string' && body.password.length >= 8
        ? body.password
        : undefined

      finalPassword = newPassword
      if (!finalPassword) {
        const adjectives = ['Fast','Sharp','Bright','Bold','Clear','Cool','Deep','Dry','Easy','Fast']
        const nouns = ['Fox','Hawk','Lion','Bear','Wolf','Deer','Owl','Elk','Ape','Bee']
        const rand = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]
        const suffix = Math.floor(1000 + Math.random() * 9000)
        finalPassword = `${rand(adjectives)}${rand(nouns)}${suffix}!`
      }

      const hash = await bcrypt.hash(finalPassword, 10)

      const result = await executeWithFailover(async (client, dbType) => {
        if (dbType === 'turso') {
          await client.execute({
            sql: 'UPDATE Customer SET password = ? WHERE id = ?',
            args: [hash, params.id],
          })
        } else {
          await client.query('UPDATE "Customer" SET password = $1 WHERE id = $2', [hash, params.id])
        }
        return { updated: true }
      })

      if (!result) {
        return NextResponse.json({ ok: true, password: finalPassword, fallback: 'error', warning: 'DB error - password may not have been updated' })
      }

      return NextResponse.json({ ok: true, password: finalPassword, fallback: result.dbType })
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  } catch (error: any) {
    const status = error?.cause?.status || 500
    if (status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    console.error('[admin customers/[id] POST] error:', error)
    return NextResponse.json({ ok: true, password: finalPassword ?? 'unknown', fallback: 'error', warning: 'DB error - password may not have been updated' }, { status: 200 })
  }
}