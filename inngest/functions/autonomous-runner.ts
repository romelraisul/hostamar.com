// ============================================================================
// autonomous-runner — cron "*/10 * * * *". Queries enabled AutonomousTasks that
// are due (nextRunAt <= now), locks each (status=running), runs the HarnessAgent
// with all providers wired, writes a TaskRunLog, then unlocks and computes the
// next run time from the task's cron schedule (cron-parser).
// ============================================================================
import { inngest } from '@/inngest/client'
import { prisma } from '@/lib/prisma'
import { ensureHarnessSchema } from '@/lib/harness/ensure-harness-schema'
import { HarnessAgent } from '@/lib/harness/HarnessAgent'
// cron-parser v4 exports parseExpression; v5 exports CronExpressionParser.
// Use a defensive require so both work.
const cronParser = require('cron-parser')

function nextFromCron(expr: string, from = new Date()): Date {
  try {
    if (typeof cronParser.parseExpression === 'function') {
      return cronParser.parseExpression(expr, { currentDate: from }).next().toDate()
    }
    if (cronParser.CronExpressionParser?.parse) {
      return cronParser.CronExpressionParser.parse(expr, { currentDate: from }).next().toDate()
    }
  } catch {
    /* fall through */
  }
  // default: +10 minutes
  return new Date(from.getTime() + 10 * 60 * 1000)
}

export const autonomousRunner = inngest.createFunction(
  { id: 'autonomous-runner', name: 'Hostamar Autonomous Runner', triggers: [{ cron: '*/10 * * * *' }] },
  async ({ step }) => {
    await step.run('ensure-schema', async () => {
      await ensureHarnessSchema().catch(() => undefined)
    })

    const due = await step.run('query-due', async () => {
      const now = new Date()
      return prisma.autonomousTask.findMany({
        where: {
          enabled: true,
          status: { not: 'running' },
          OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }],
        },
        take: 10,
      })
    })

    const ran: { slug: string; status: string; runId: string }[] = []

    for (const task of due) {
      // Lock
      const locked = await step.run(`lock-${task.slug}`, async () => {
        const res = await prisma.autonomousTask.updateMany({
          where: { id: task.id, status: { not: 'running' } },
          data: { status: 'running', lastRunAt: new Date() },
        })
        return res.count === 1
      })
      if (!locked) continue

      const run = await step.run(`run-${task.slug}`, async () => {
        const log = await prisma.taskRunLog.create({
          data: { taskId: task.id, status: 'running' },
        })
        try {
          const agent = new HarnessAgent({ fileRoot: '/app/working' })
          const cfg = (task.configJson as Record<string, unknown>) || {}
          const prompt =
            (cfg.prompt as string) ||
            `Run autonomous task ${task.slug}: research leads and generate an SEO report.`
          // System tasks auto-approve their own risky tools (trusted schedule).
          const result = await agent.execute({
            prompt,
            mode: 'execute',
            owner: task.owner,
            autoApprove: task.owner === 'system',
            fileRoot: '/app/working',
          })
          await prisma.taskRunLog.update({
            where: { id: log.id },
            data: { status: 'completed', finishedAt: new Date(), outputJson: result as object },
          })
          return { runId: log.id, status: 'completed' }
        } catch (err) {
          await prisma.taskRunLog.update({
            where: { id: log.id },
            data: {
              status: 'failed',
              finishedAt: new Date(),
              error: err instanceof Error ? err.message : String(err),
            },
          })
          return { runId: log.id, status: 'failed' }
        }
      })

      // Unlock + schedule next
      await step.run(`unlock-${task.slug}`, async () => {
        await prisma.autonomousTask.update({
          where: { id: task.id },
          data: { status: 'idle', nextRunAt: nextFromCron(task.schedule) },
        })
      })

      ran.push({ slug: task.slug, status: run.status, runId: run.runId })
    }

    return { ranCount: ran.length, ran }
  },
)
