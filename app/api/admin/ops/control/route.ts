// /api/admin/ops/control — pause / resume / autonomy per employee lane.
// POST { employee, paused?, autonomy?, note? } → upsert FleetControl,
//      write a CONTROL FleetEvent, return the row.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { isOpsEmployee } from '@/lib/ops-lanes'
import { recordOpsEvent } from '@/lib/ops-events'

export const dynamic = 'force-dynamic'

const AUTONOMY = ['autonomous', 'supervised', 'halted'] as const

async function isAdmin(req: NextRequest): Promise<{ id: string; email: string } | null> {
  const token = req.cookies.get('auth_token')?.value
  if (!token) return null
  const payload = verifyToken(token)
  if (!payload || (payload.role !== 'admin' && payload.role !== 'superadmin')) return null
  return { id: payload.id, email: payload.email }
}

export async function POST(req: NextRequest) {
  const admin = await isAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 })
  }

  const employee = String(body.employee || '').trim()
  if (!isOpsEmployee(employee)) {
    return NextResponse.json({ error: 'Unknown employee' }, { status: 400 })
  }

  const autonomyRaw = body.autonomy === undefined ? undefined : String(body.autonomy).trim().toLowerCase()
  if (autonomyRaw !== undefined && !(AUTONOMY as readonly string[]).includes(autonomyRaw)) {
    return NextResponse.json({ error: 'autonomy must be autonomous | supervised | halted' }, { status: 400 })
  }
  const paused = body.paused === undefined ? undefined : !!body.paused
  const note = body.note === undefined ? undefined : String(body.note).slice(0, 500)
  if (paused === undefined && autonomyRaw === undefined && note === undefined) {
    return NextResponse.json({ error: 'Nothing to update (paused | autonomy | note)' }, { status: 400 })
  }

  const create: Record<string, unknown> = { employee }
  const update: Record<string, unknown> = { updatedBy: admin.email }
  if (paused !== undefined) {
    create.paused = paused
    update.paused = paused
  }
  if (autonomyRaw !== undefined) {
    create.autonomy = autonomyRaw
    update.autonomy = autonomyRaw
  }
  if (note !== undefined) {
    create.note = note
    update.note = note
  }

  const row = await prisma.fleetControl.upsert({
    where: { employee },
    create: create as any,
    update: update as any,
  })

  await recordOpsEvent({
    lane: employee,
    type: 'CONTROL',
    severity: 'warn',
    title: `Control — ${employee}${row.paused ? ' paused' : ' resumed'} · ${row.autonomy}`,
    body: note || null,
    meta: { employee, paused: row.paused, autonomy: row.autonomy, by: admin.email },
  })

  return NextResponse.json({ ok: true, control: row })
}
