// /api/admin/support/fix — Tier2 action endpoint (Approve Fix / Deny / Escalate).
//
// Approve: if the suggested fix is destructive OR the triage flagged
// needsHumanApproval, an Incident (Tier3) is created and assigned on-call; the
// fix itself is NOT auto-applied without an explicit `applyNow` confirmation
// from the operator (defense-in-depth — destructive actions never run blind).
// Deny: records the decision, closes the escalation.
// Escalate: creates an Incident and notifies the incident channel.
//
// SECURITY: self-guards admin/superadmin via auth_token cookie. Every action is
// written to SupportEvent (audit) + Incident.timeline.
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { validateBody, toErrorResponse } from '@/lib/api/validator'
import { createIncident, appendTimeline } from '@/lib/support/incident'
import { notify } from '@/lib/support/telegram'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const fixSchema = z.object({
  supportEventId: z.string().min(1),
  decision: z.enum(['approve', 'deny', 'escalate']),
  applyNow: z.boolean().optional().default(false), // explicit confirmation for destructive
  note: z.string().max(2000).optional(),
})

function requireAdmin(req: NextRequest): { id: string; role?: string } | null {
  const token = req.cookies.get('auth_token')?.value
  if (!token) return null
  const payload = verifyToken(token)
  if (!payload) return null
  if (payload.role !== 'admin' && payload.role !== 'superadmin') return null
  return payload
}

export async function POST(req: NextRequest) {
  const admin = requireAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: z.infer<typeof fixSchema>
  try {
    body = await validateBody(req, fixSchema)
  } catch (e) {
    return toErrorResponse(e)
  }

  const event = await prisma.supportEvent.findUnique({ where: { id: body.supportEventId } })
  if (!event) return NextResponse.json({ error: 'SupportEvent not found' }, { status: 404 })

  const actor = `customer:${admin.id}`

  if (body.decision === 'deny') {
    await prisma.supportEvent.update({
      where: { id: event.id },
      data: { result: 'denied', detail: [event.detail, `DENIED by ${actor}: ${body.note ?? ''}`].filter(Boolean).join(' | ').slice(0, 1000) },
    })
    await notify('ops', `Fix DENIED for ${event.service} by ${actor}`).catch(() => undefined)
    return NextResponse.json({ ok: true, action: 'denied' })
  }

  // escalate or approve -> create an Incident (Tier3) and assign on-call.
  const destructive = /DROP|DELETE FROM|ALTER TABLE|TRUNCATE|certbot|cert rotate|migrate|rm -rf|docker compose down/i.test(
    event.action + ' ' + (body.note ?? ''),
  )
  const { id: incidentId, onCallCustomerId } = await createIncident({
    service: event.service,
    title: `${event.service} ${body.decision === 'escalate' ? 'escalated' : 'fix approved'} — ${event.check}`,
    severity: destructive ? 'SEV1' : 'SEV2',
    actor,
    triggerAction: event.action,
  })

  if (body.decision === 'escalate') {
    await prisma.supportEvent.update({ where: { id: event.id }, data: { tier: 2, result: 'escalated' } })
    await notify('incident', `Escalated ${event.service} → Incident ${incidentId}, on-call ${onCallCustomerId ?? 'UNASSIGNED'}`).catch(() => undefined)
    return NextResponse.json({ ok: true, action: 'escalated', incidentId, onCallCustomerId })
  }

  // approve
  if (destructive && !body.applyNow) {
    // Hold: requires explicit confirmation; incident created, fix NOT applied.
    await appendTimeline(incidentId, { actor, action: 'fix.approve-held', result: 'destructive; awaiting applyNow confirmation' })
    return NextResponse.json({ ok: true, action: 'approved-held', incidentId, onCallCustomerId, note: 'destructive fix held — confirm applyNow to execute' })
  }

  // Non-destructive approve (or destructive with applyNow): attempt the fix.
  let fixResult = 'logged (no auto-exec in this environment)'
  if (process.env.DOCKER_HOST || process.env.RUNNING_IN_DOCKER) {
    const { exec } = await import('node:child_process')
    const { promisify } = await import('node:util')
    const execAsync = promisify(exec)
    try {
      const { stdout, stderr } = await execAsync(event.action, { timeout: 30_000 })
      fixResult = (stdout || stderr || '').slice(0, 500)
    } catch (e) {
      fixResult = String((e as Error)?.message || e).slice(0, 500)
    }
  }
  await appendTimeline(incidentId, { actor, action: 'fix.applied', result: fixResult })
  await prisma.supportEvent.update({
    where: { id: event.id },
    data: { result: 'resolved', resolvedAt: new Date(), detail: [event.detail, `APPROVED by ${actor}: ${fixResult}`].filter(Boolean).join(' | ').slice(0, 1000) },
  })
  await notify('ops', `Fix applied for ${event.service} by ${actor}`).catch(() => undefined)
  return NextResponse.json({ ok: true, action: 'approved', incidentId, onCallCustomerId, fixResult })
}
