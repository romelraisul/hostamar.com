// ============================================================================
// lib/support/triageAgent.ts — Tier2 assisted triage "agent".
//
// Given a SupportEvent (escalated by Tier1) it assembles context: the SOP md,
// the last 50 docker logs (from event.detail / logsTail), recent TaskRunLog
// failures (GoalRunner loop), and optionally Qdrant. Produces a structured
// triage decision. It is deterministic + heuristic by default (no mandatory
// LLM call) so it works on the free tier; if Ollama is configured it can be
// upgraded to an LLM-backed explanation, but the decision shape is fixed.
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { prisma } from '@/lib/prisma'

export interface TriageDecision {
  probableCause: string
  confidence: number // 0..1
  suggestedFix: string
  runbookLink: string
  needsHumanApproval: boolean
  destructive: boolean
}

const SOPS_DIR = path.resolve(process.cwd(), 'working', 'sops')

function loadSop(service: string): string {
  try {
    return fs.readFileSync(path.join(SOPS_DIR, `${service}.md`), 'utf8').slice(0, 1500)
  } catch {
    return '(SOP not generated yet)'
  }
}

function isDestructive(suggestedFix: string): boolean {
  const danger = ['DROP', 'DELETE FROM', 'ALTER TABLE', 'TRUNCATE', 'certbot', 'cert rotate', 'migrate', 'rm -rf', 'docker compose down']
  return danger.some((d) => suggestedFix.toLowerCase().includes(d.toLowerCase()))
}

export async function triageEvent(event: {
  id: string
  service: string
  check: string
  detail?: string | null
  logsTail?: string
}): Promise<TriageDecision> {
  const sop = loadSop(event.service)

  // Recent autonomous loop failures for correlation (GoalRunner TaskRunLog).
  const recentTaskFailures = await prisma.taskRunLog
    .findMany({
      where: { status: { not: 'completed' } },
      orderBy: { startedAt: 'desc' },
      take: 5,
      select: { taskId: true, status: true, startedAt: true, error: true },
    })
    .catch(() => [])

  const detail = event.detail || event.logsTail || ''
  const lower = `${detail} ${event.check}`.toLowerCase()

  // Heuristic probable-cause mapping (grounded to the SOPs we generate).
  let probableCause = 'unknown'
  let suggestedFix = 'Review SOP and restart the service.'
  let confidence = 0.5

  if (lower.includes('connection') || lower.includes('econnrefused') || lower.includes('timeout')) {
    probableCause = `${event.service} unreachable — network/process down`
    suggestedFix = `docker compose -f docker-compose.vps.yml restart ${event.service}`
    confidence = 0.75
  } else if (lower.includes('ready') || lower.includes('not ready') || lower.includes('pg_isready')) {
    probableCause = 'postgres not ready / crashed'
    suggestedFix = 'docker compose -f docker-compose.vps.yml restart postgres'
    confidence = 0.8
  } else if (lower.includes('ratelimit') || lower.includes('too many')) {
    probableCause = 'rate-limit store saturated'
    suggestedFix = 'Flush rate-limit table: DELETE FROM "RateLimitEvent" WHERE "createdAt" < now() - interval \'1 hour\''
    confidence = 0.7
  } else if (recentTaskFailures.length > 0) {
    probableCause = `autonomous loop failing (${recentTaskFailures[0].taskId}) — possible cascade`
    suggestedFix = 'Inspect GoalRunner task; re-run failed AutonomousTask.'
    confidence = 0.6
  }

  if (recentTaskFailures.length > 0) {
    suggestedFix += ` | corr: ${recentTaskFailures.length} recent loop failure(s) task=${recentTaskFailures[0].taskId}`
  }

  // Reference the SOP's auto-fix section so the operator has the runbook inline.
  const sopFix = sop.split('## Auto-fix')[1]?.split('\n')[1]?.trim()
  if (sopFix) suggestedFix += ` | SOP: ${sopFix}`

  const destructive = isDestructive(suggestedFix)
  const needsHumanApproval = destructive || confidence < 0.7

  return {
    probableCause,
    confidence,
    suggestedFix,
    runbookLink: `/docs/sops/${event.service}`,
    needsHumanApproval,
    destructive,
  }
}
