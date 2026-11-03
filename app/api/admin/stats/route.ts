export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { createClient } from '@libsql/client/web'

function getTursoClient() {
  const url = (process.env.TURSO_DATABASE_URL || '').replace(/^libsql:\/\//, 'https://')
  const authToken = process.env.TURSO_AUTH_TOKEN || ''
  return createClient({ url, authToken })
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const db = getTursoClient()
    const c = await db.execute({ sql: 'SELECT COUNT(*) as cnt FROM Customer', args: [] })
    return NextResponse.json({ ok: true, customers: c.rows[0] })
  } catch (e: any) {
    const msg = e?.message || 'error'
    const status = msg.includes('UNAUTHORIZED') ? 401 : msg.includes('FORBIDDEN') ? 403 : 500
    return NextResponse.json({ ok: false, error: msg }, { status })
  }
}
