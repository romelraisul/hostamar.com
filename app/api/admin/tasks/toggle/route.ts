// POST /api/admin/tasks/toggle — enable/disable an autonomous task.
// Body: { slug: string, enabled: boolean }
import { NextRequest, NextResponse } from 'next/server'
import { guardInternal } from '@/lib/harness/guard'
import { prisma } from '@/lib/prisma'
import { ensureHarnessSchema } from '@/lib/harness/ensure-harness-schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const denied = guardInternal(req)
  if (denied) return denied
  const { slug, enabled } = await req.json().catch(() => ({}))
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })
  await ensureHarnessSchema().catch(() => undefined)
  const updated = await prisma.autonomousTask.updateMany({
    where: { slug },
    data: { enabled: Boolean(enabled) },
  })
  return NextResponse.json({ updated: updated.count })
}
