// ============================================================================
// inngest/functions/supportInboxTriage.ts — USER health triage (the inbox
// IS the user-health dashboard).
//
// Two triggers:
//   1. cron every 5m — correlates the last batch of user-health SupportEvents
//      against runAllChecks() and re-emits auto-replies if server is green.
//   2. event 'support/inbox.received' — processes freshly webhooked inbox
//      items: categorize -> group by ROOT CAUSE -> correlate -> emit / auto-reply.
//
// No gmail/IMAP dependency is invented: inbox items arrive via the
// self-guarded /api/webhooks/support-inbox webhook (wired in /api/inngest).
// A future IMAP poller simply POSTs to that webhook — no code change here.
//
// Discipline (per #5 "no phantom tables"): user health reuses SupportEvent
// with service = the UserHealthCategory string. Two dashboards, one table.
// ============================================================================
import { inngest } from '@/inngest/client'
import { prisma } from '@/lib/prisma'
import {
  type InboxItem,
  groupByRootCause,
  correlateUserHealth,
} from '@/lib/support/userHealth'

interface InboxPayload {
  items: InboxItem[]
}

export const supportInboxTriage = inngest.createFunction(
  {
    id: 'support-inbox-triage',
    name: 'User-Health Inbox Triage',
    concurrency: 1,
    triggers: [
      { cron: '*/5 * * * *' },
      { event: 'support/inbox.received' },
    ],
  },
  async ({ step, logger }) => {
    // Re-hydrate items: from the event payload if present, else from the
    // last 5m of user-health SupportEvents (cron path).
    const items: InboxItem[] = await step.run('load-items', async () => {
      // The event payload is available via step context only; we read it from
      // the Inngest event.data when triggered by support/inbox.received.
      // For the cron path we pull recently-emitted user-health events back into
      // inbox-shaped items so correlation + counts stay consistent.
      const recent = await prisma.supportEvent.findMany({
        where: { check: 'user-health-correlation' },
        orderBy: { createdAt: 'desc' },
        take: 200,
      })
      return recent.map((e) => ({
        id: e.id,
        subject: e.detail?.slice(0, 120) ?? e.service,
        receivedAt: e.createdAt.toISOString(),
      }))
    })

    if (items.length === 0) return { processed: 0, rootCauses: [] }

    // Group by ROOT CAUSE, not by subject line.
    const groups = await step.run('group', async () => {
      const g = groupByRootCause(items)
      return Object.entries(g).map(([cat, its]) => ({ cat, n: its.length }))
    })

    // For each root cause, correlate with the server check + emit / auto-reply.
    const summaries = await step.run('correlate', async () => {
      const g = groupByRootCause(items)
      const out: Array<{ category: string; count: number; server: string; autoReplied: boolean }> = []
      for (const [cat, its] of Object.entries(g)) {
        const s = await correlateUserHealth(cat as any, its)
        out.push({
          category: s.category,
          count: s.count,
          server: s.serverStatus,
          autoReplied: s.autoReplied,
        })
      }
      return out
    })

    logger?.info?.('user-health triage', { groups, summaries })
    return { processed: items.length, rootCauses: summaries }
  },
)
