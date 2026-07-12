// GET /api/harness/mode — current agent mode (from HarnessSession), default plan.
import { NextRequest, NextResponse } from 'next/server'
import { guardInternal } from '@/lib/harness/guard'
import { prisma } from '@/lib/prisma'
import { ensureHarnessSchema } from '@/lib/harness/ensure-harness-schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const denied = guardInternal(req)
  if (denied) return denied
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  await ensureHarnessSchema().catch(() => undefined)
  if (!sessionId) return NextResponse.json({ mode: 'plan' })
  const s = await prisma.harnessSession.findUnique({ where: { id: sessionId } })
  return NextResponse.json({ mode: s?.mode || 'plan' })
}
