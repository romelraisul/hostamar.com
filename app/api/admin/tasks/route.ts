// GET /api/admin/tasks — list all autonomous tasks (internal-key guarded).
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
  const tasks = await prisma.autonomousTask.findMany({ orderBy: { slug: 'asc' } })
  return NextResponse.json(tasks)
}
