// ============================================================================
// inngest/functions/supportAutoResolve.ts — Tier1 automated resolution.
//
// Cron every 5 minutes. Runs lib/support/checks, and for any RED service:
//   1. attempts the SOP auto-fix (docker restart via child_process.exec, only
//      when DOCKER_HOST is present — never on Vercel serverless);
//   2. logs a SupportEvent (tier=1);
//   3. notifies the support Telegram channel;
//   4. if the same service failed 3x in the last 10 minutes, emits
//      `support.escalate.tier2` for the Tier2 triage agent.
//
// No external paid service — uses existing prisma + inngest + telegram.
// ============================================================================
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { inngest } from '@/inngest/client'
import { runAllChecks, type CheckResult, type ServiceName } from '@/lib/support/checks'
import { prisma } from '@/lib/prisma'
import { notify } from '@/lib/support/telegram'

const execAsync = promisify(exec)
const FAIL_WINDOW_MS = 10 * 60 * 1000
const FAIL_THRESHOLD = 3

// Container/service restart command from docker-compose.vps.yml service names.
// Maps our logical service to the compose service name.
const COMPOSE_SERVICE: Partial<Record<ServiceName, string>> = {
  app: 'app',
  postgres: 'postgres',
  redis: 'redis',
}

function autorestartCommand(service: ServiceName): string | null {
  const target = COMPOSE_SERVICE[service]
  if (!target) return null
  const compose = process.env.SUPPORT_COMPOSE_FILE || 'docker-compose.vps.yml'
  return `docker compose -f ${compose} restart ${target}`
}

async function attemptAutoFix(service: ServiceName, result: CheckResult): Promise<{ action: string; ok: boolean; detail?: string }> {
  const cmd = autorestartCommand(service)
  if (!cmd) {
    return { action: 'no-auto-fix', ok: false, detail: `no restart mapping for ${service}` }
  }
  // Only act when we can actually reach a docker daemon (self-hosted VPS).
  if (!process.env.DOCKER_HOST && !process.env.RUNNING_IN_DOCKER) {
    return { action: cmd, ok: false, detail: 'DOCKER_HOST not present — logging intent only (no restart executed).' }
  }
  try {
    const { stdout, stderr } = await execAsync(cmd, { timeout: 30_000 })
    return { action: cmd, ok: true, detail: (stdout || stderr || '').slice(0, 500) }
  } catch (e) {
    return { action: cmd, ok: false, detail: String((e as Error)?.message || e).slice(0, 500) }
  }
}

async function countRecentFailures(service: ServiceName): Promise<number> {
  const since = new Date(Date.now() - FAIL_WINDOW_MS)
  return prisma.supportEvent.count({
    where: {
      service,
      tier: 1,
      result: { in: ['failed', 'escalated'] },
      createdAt: { gte: since },
    },
  })
}

async function lastLogsTail(service: ServiceName): Promise<string> {
  const container = `hostamar-${service === 'app' ? 'app' : service}`
  if (!process.env.DOCKER_HOST && !process.env.RUNNING_IN_DOCKER) return '(docker logs unavailable in this environment)'
  try {
    const { stdout } = await execAsync(`docker logs ${container} --tail 50 2>&1`, { timeout: 10_000 })
    return stdout.slice(-2000)
  } catch (e) {
    return String((e as Error)?.message || e).slice(0, 500)
  }
}

export const supportAutoResolve = inngest.createFunction(
  { id: 'support-auto-resolve', name: 'Tier1 Support Auto-Resolve', concurrency: 1, triggers: [{ cron: '*/5 * * * *' }] },
  async ({ step, logger }) => {
    const results = await step.run('run-checks', async () => {
      const all = await runAllChecks()
      return all
    })

    const failures = results.filter((r) => !r.ok)
    const summary: Record<string, unknown> = { ran: results.length, failed: failures.length }

    for (const r of failures) {
      await step.run(`fix-${r.service}`, async () => {
        const fix = await attemptAutoFix(r.service, r)
        const priorFailures = await countRecentFailures(r.service)
        const willEscalate = priorFailures + 1 >= FAIL_THRESHOLD

        const event = await prisma.supportEvent.create({
          data: {
            tier: willEscalate ? 2 : 1,
            service: r.service,
            check: r.check,
            action: fix.action,
            result: willEscalate ? 'escalated' : fix.ok ? 'resolved' : 'failed',
            detail: [fix.detail, r.detail].filter(Boolean).join(' | ').slice(0, 1000),
            resolvedAt: fix.ok ? new Date() : null,
          },
        })

        await notify(
          'support',
          `${r.service} down via ${fix.action} → ${fix.ok ? 'resolved' : willEscalate ? 'escalated to Tier2' : 'failed'}`,
        ).catch(() => undefined)

        if (willEscalate) {
          const logsTail = await lastLogsTail(r.service)
          await inngest.send({
            name: 'support.escalate.tier2',
            data: {
              service: r.service,
              failures: priorFailures + 1,
              check: r.check,
              logsTail,
              supportEventId: event.id,
            },
          }).catch((e) => logger?.warn?.('escalate send failed', e))
        }
        return { service: r.service, fix: fix.ok, escalated: willEscalate }
      })
    }

    // Count healthy + write a green heartbeat event for the status page.
    await step.run('heartbeat', async () => {
      await prisma.supportEvent.create({
        data: { tier: 1, service: 'app', check: 'tier1-heartbeat', action: 'cron', result: 'resolved', detail: `checked=${results.length} failed=${failures.length}` },
      }).catch(() => undefined)
      return summary
    })

    return summary
  },
)
