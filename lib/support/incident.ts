// ============================================================================
// lib/support/incident.ts — Tier3 incident response + on-call rotation.
//
// Created when a Tier2 fix needs human approval OR is destructive. We assign an
// on-call from Organization members with role=owner, round-robin, using a
// pointer stored in the Incident table's own row (createdAt ordering) — no
// extra table, no Redis dependency. The timeline is append-only JSON[].
// ============================================================================
import { prisma } from '@/lib/prisma'
import { notify } from '@/lib/support/telegram'

export type Severity = 'SEV1' | 'SEV2' | 'SEV3'

export interface TimelineEntry {
  at: string
  actor: string // customerId | 'system' | 'agent'
  action: string
  result: string
}

/** Append a timeline entry atomically (read-modify-write; safe at low volume). */
export async function appendTimeline(incidentId: string, entry: Omit<TimelineEntry, 'at'>): Promise<void> {
  const incident = await prisma.incident.findUnique({ where: { id: incidentId }, select: { timeline: true } })
  if (!incident) return
  const timeline = Array.isArray(incident.timeline) ? (incident.timeline as unknown as TimelineEntry[]) : []
  timeline.push({ ...entry, at: new Date().toISOString() })
  await prisma.incident.update({
    where: { id: incidentId },
    data: { timeline: timeline as any },
  })
}

/**
 * Pick the next on-call owner round-robin across all organizations' owners.
 * Uses the count of previously-created incidents to rotate deterministically
 * so restarts don't reset the pointer.
 */
export async function pickOnCall(): Promise<string | null> {
  const owners = await prisma.membership.findMany({
    where: { role: 'owner' },
    select: { customerId: true },
    orderBy: { id: 'asc' },
    distinct: ['customerId'],
  })
  if (owners.length === 0) return null
  const priorCount = await prisma.incident.count()
  const idx = priorCount % owners.length
  return owners[idx]?.customerId ?? null
}

export async function createIncident(opts: {
  service: string
  title: string
  severity?: Severity
  onCallCustomerId?: string
  actor?: string
  triggerAction?: string
}): Promise<{ id: string; onCallCustomerId: string | null }> {
  const onCallCustomerId = opts.onCallCustomerId ?? (await pickOnCall())
  const incident = await prisma.incident.create({
    data: {
      service: opts.service,
      title: opts.title,
      severity: opts.severity ?? 'SEV2',
      onCallCustomerId,
      timeline: [
        {
          at: new Date().toISOString(),
          actor: opts.actor ?? 'system',
          action: 'incident.created',
          result: opts.triggerAction ?? 'auto-created from Tier2 escalation',
        },
      ] as any,
    },
  })
  await notify('incident', `${opts.title} → assigned on-call ${onCallCustomerId ?? 'UNASSIGNED'}`).catch(() => undefined)
  return { id: incident.id, onCallCustomerId }
}

export async function resolveIncident(incidentId: string, actor: string): Promise<void> {
  await prisma.incident.update({
    where: { id: incidentId },
    data: { status: 'resolved', resolvedAt: new Date() },
  })
  await appendTimeline(incidentId, { actor, action: 'incident.resolved', result: 'status=resolved' })
}
