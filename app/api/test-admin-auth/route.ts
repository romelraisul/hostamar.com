export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const result = await requireAdmin(req)
    return NextResponse.json({ success: true, user: { id: result.id, role: result.role } })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message, stack: e?.stack }, { status: e?.cause?.status || 500 })
  }
}
