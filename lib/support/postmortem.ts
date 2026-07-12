// ============================================================================
// lib/support/postmortem.ts — Tier3 post-mortem generator.
//
// On incident resolve, generates working/reports/incident-{id}-postmortem.md
// (root cause + timeline + action items) and creates AutonomousTask entries for
// the follow-up fixes (reuses the GoalRunner loop — these tasks are picked up
// by the existing autonomous-runner cron).
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { prisma } from '@/lib/prisma'
import { appendTimeline } from '@/lib/support/incident'

const REPORTS_DIR = path.resolve(process.cwd(), 'working', 'reports')

export interface PostmortemActionItem {
  title: string
  owner: string // "system" | "customer:<email>"
  schedule: string // cron
}

export async function generatePostmortem(
  incidentId: string,
  actionItems: PostmortemActionItem[] = [],
): Promise<{ file: string; taskIds: string[] }> {
  const incident = await prisma.incident.findUnique({ where: { id: incidentId } })
  if (!incident) throw new Error(`incident ${incidentId} not found`)

  const timeline = Array.isArray(incident.timeline) ? (incident.timeline as any[]) : []
  const timelineMd = timeline
    .map((e) => `- **${e.at}** · _${e.actor}_ · ${e.action} → ${e.result}`)
    .join('\n')

  const actionMd = actionItems.length
    ? actionItems.map((a, i) => `${i + 1}. [ ] ${a.title} (owner=${a.owner}, schedule=\`${a.schedule}\`)`).join('\n')
    : '1. [ ] Review and schedule preventive fix.'

  const md = `# Incident Post-Mortem — ${incident.id}

**Severity:** ${incident.severity}
**Service:** ${incident.service}
**Status:** ${incident.status}
**Created:** ${incident.createdAt.toISOString()}
**Resolved:** ${incident.resolvedAt?.toISOString() ?? '—'}
**On-call:** ${incident.onCallCustomerId ?? 'UNASSIGNED'}

## Title
${incident.title}

## Root Cause
_Auto-summary from timeline + triage context._

## Timeline
${timelineMd || '(no timeline entries)'}

## Action Items
${actionMd}
`

  fs.mkdirSync(REPORTS_DIR, { recursive: true })
  const file = path.join(REPORTS_DIR, `incident-${incident.id}-postmortem.md`)
  fs.writeFileSync(file, md)

  // Create AutonomousTask entries so the GoalRunner loop picks them up.
  const taskIds: string[] = []
  for (const item of actionItems) {
    const slug = `pm-${incident.id}-${taskIds.length + 1}`.slice(0, 60)
    const task = await prisma.autonomousTask
      .upsert({
        where: { slug },
        update: { enabled: true },
        create: {
          slug,
          owner: item.owner,
          schedule: item.schedule,
          configJson: { title: item.title, sourceIncident: incidentId } as any,
          status: 'idle',
        },
      })
      .catch(() => null)
    if (task) taskIds.push(task.id)
  }

  await appendTimeline(incidentId, {
    actor: 'system',
    action: 'postmortem.generated',
    result: `file=${path.basename(file)} tasks=${taskIds.length}`,
  })

  return { file, taskIds }
}
