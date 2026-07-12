// ============================================================================
// goal-tick — the dynamic loop heartbeat (cron "0 * * * *", hourly).
// Loads every active Goal and runs one GoalRunner tick. Polling AutonomousTasks
// remain the WORKERS; this function is the MANAGER that decides what they do
// next based on the live gap to the target.
// ============================================================================
import { inngest } from '@/inngest/client'
import { GoalRunner } from '@/lib/autonomy/GoalRunner'
import { ensureGoalSchema } from '@/lib/autonomy/ensure-goal-schema'
import { prisma } from '@/lib/prisma'

export const goalTick = inngest.createFunction(
  { id: 'goal-tick', name: 'Hostamar Goal Loop', concurrency: 1, triggers: [{ cron: '0 * * * *' }] },
  async ({ step }) => {
    await step.run('ensure-schema', async () => {
      await ensureGoalSchema().catch(() => undefined)
    })

    const goals = await step.run('load-goals', async () => {
      return prisma.goal.findMany({ where: { status: 'active' }, select: { slug: true } })
    })

    const results: Record<string, unknown> = {}
    for (const g of goals) {
      await step.run(`tick-${g.slug}`, async () => {
        const res = await new GoalRunner().tick(g.slug)
        results[g.slug] = { iteration: res.iteration, actions: res.actions.length, achieved: res.achieved }
      })
    }

    return { ticked: goals.length, results }
  },
)
