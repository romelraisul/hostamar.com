export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { runViralResearch } from '@/lib/tv/viral/researcher'

export async function POST(_req: NextRequest) {
  try {
    const result = await runViralResearch()
    return NextResponse.json({ ok: true, ...result })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 })
  }
}
export async function GET(req: NextRequest) { return POST(req) }
