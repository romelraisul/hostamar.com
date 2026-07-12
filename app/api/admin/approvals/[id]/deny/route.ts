// POST /api/admin/approvals/:id/deny — deny a pending approval.
import { NextRequest, NextResponse } from 'next/server'
import { guardInternal } from '@/lib/harness/guard'
import { prisma } from '@/lib/prisma'
import { ensureHarnessSchema } from '@/lib/harness/ensure-harness-schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = guardInternal(req)
  if (denied) return denied
  await ensureHarnessSchema().catch(() => undefined)
  const updated = await prisma.approvalQueue.updateMany({
    where: { id: params.id, status: 'pending' },
    data: { status: 'denied', decidedAt: new Date() },
  })
  if (updated.count === 0) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ id: params.id, status: 'denied' })
}
