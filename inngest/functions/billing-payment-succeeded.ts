// ============================================================================
// billing-payment-succeeded — Inngest worker for `billing/payment.succeeded`.
// On a real bKash payment we re-measure MRR and, if it crosses the ৳1L goal
// target, spawn a `celebrate-mrr-milestone` AutonomousTask so the loop closes
// the gap from REAL paid orgs, not contentCount.
// ============================================================================
import { inngest } from '@/inngest/client'
import { measureMRR } from '@/lib/autonomy/tools/measureMRR'
import { prisma } from '@/lib/prisma'

export const billingPaymentSucceeded = inngest.createFunction(
  {
    id: 'billing-payment-succeeded',
    name: 'Billing Payment Succeeded',
    triggers: [{ event: 'billing/payment.succeeded' }],
  },
  async ({ event, step }) => {
    const metrics = await step.run('measure-mrr', async () => measureMRR())

    // Find the ৳1L goal and check for milestone crossing.
    const goal = (await step.run('load-goal', async () =>
      prisma.goal.findUnique({ where: { slug: 'mrr-1lakh' } })
    )) as { kpiTarget: Record<string, unknown> } | null

    const targetMrr = Number(goal?.kpiTarget?.mrr ?? 100000)
    const crossed = metrics.mrr >= targetMrr

    if (crossed) {
      await step.run('milestone-task', async () => {
        // Only create once per achievement window: dedupe by slug.
        const existing = await prisma.autonomousTask.findUnique({ where: { slug: 'celebrate-mrr-milestone' } })
        if (!existing) {
          await prisma.autonomousTask.create({
            data: {
              slug: 'celebrate-mrr-milestone',
              owner: 'system',
              schedule: '0 9 * * *', // 9am daily; goal-loop picks it up
              enabled: true,
              status: 'idle',
              configJson: {
                title: 'MRR milestone reached 🎉',
                prompt: `Hostamar crossed ৳${metrics.mrr.toLocaleString('en-IN')} MRR from ${metrics.payingOrgs} paying orgs / ${metrics.payingUsers} paying users. Publish a milestone blog post + customer story.`,
                priority: 'high',
              },
            },
          })
        }
        return { created: !existing }
      })
    }

    return { mrr: metrics.mrr, payingOrgs: metrics.payingOrgs, crossed, targetMrr }
  },
)
