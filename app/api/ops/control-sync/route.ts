// /api/ops/control-sync — consumed by the WSL Hermes "Fleet Control Sync" job.
// NO admin cookie: self-guards with the x-fleet-secret header (FLEET_REPORT_SECRET).
// Public in middleware.ts (publicApiPaths) but fail-closed here.
// GET → { controls: [{ employee, paused, autonomy, note, updatedAt }], lanes: [...16] }
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { OPS_EMPLOYEES } from '@/lib/ops-lanes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function authorized(req: NextRequest): boolean {
  const secret = (process.env.FLEET_REPORT_SECRET || '').trim()
  const provided = (req.headers.get('x-fleet-secret') || '').trim()
  return !!secret && provided === secret
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let controls: {
    employee: string
    paused: boolean
    autonomy: string
    note: string | null
    updatedAt: Date
  }[] = []
  try {
    controls = await prisma.fleetControl.findMany({
      select: { employee: true, paused: true, autonomy: true, note: true, updatedAt: true },
      orderBy: { employee: 'asc' },
    })
  } catch {
    controls = [] // table missing in a fresh env — report no overrides (all default)
  }

  return NextResponse.json({
    controls: controls.map((c) => ({
      employee: c.employee,
      paused: c.paused,
      autonomy: c.autonomy,
      note: c.note,
      updatedAt: c.updatedAt,
    })),
    lanes: OPS_EMPLOYEES,
    generatedAt: new Date().toISOString(),
  })
}
