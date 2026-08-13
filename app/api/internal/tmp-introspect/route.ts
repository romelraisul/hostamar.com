import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// TEMP introspection route — guarded by INTERNAL_API_KEY. REMOVE after reconciliation.
export async function POST(request: NextRequest) {
  const key = process.env.INTERNAL_API_KEY || ''
  if (!key || request.headers.get('x-internal-api-key') !== key) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const tables = ['ChatMessage', 'Conversation', 'Customer']
  const out: Record<string, any> = {}
  try {
    for (const t of tables) {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        t
      )
      out[t] = rows
    }
    return NextResponse.json(out)
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 })
  }
}