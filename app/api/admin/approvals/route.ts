// GET /api/admin/approvals — list approval-queue items (internal-key guarded).
import { NextRequest, NextResponse } from 'next/server'
import { guardInternal } from '@/lib/harness/guard'
import { prisma } from '@/lib/prisma'
import { ensureHarnessSchema } from '@/lib/harness/ensure-harness-schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const denied = guardInternal(req)
  if (denied) return denied
  await ensureHarnessSchema().catch(() => undefined)
  const items = await prisma.approvalQueue.findMany({ orderBy: { createdAt: 'desc' }, take: 50 })
  return NextResponse.json(items)
}
