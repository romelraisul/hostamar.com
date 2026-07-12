// ============================================================================
// GoalRunner — the dynamic goal loop "brain" for Hostamar's autonomous engine.
//
// Every hour (Inngest goal-tick) it:
//   1. loads the Goal + measures REAL MRR / paying-users / repo signals
//   2. asks Ollama (or a deterministic heuristic fallback) for the next 1-3
//      gap-closing actions
//   3. applies them: create_task / run_task / update_prompt / ship_fix
//   4. writes a dated report JSON and pings Telegram
//   5. advances the iteration counter and flips status -> 'achieved' on target
//
// Degrades gracefully: if Ollama / Qdrant / Telegram / the harness schema is
// missing, it still produces a valid heuristic action set so the loop never
// stalls. This is what turns 15 polling crons into workers for ONE goal.
// ============================================================================
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { ensureHarnessSchema } from '@/lib/harness/ensure-harness-schema'
import { ollamaGenerate } from '@/lib/harness/ollama-client'
import { measureMRR, type MrRMetrics } from './tools/measureMRR'
import fs from 'fs'
import path from 'path'

const TELEGRAM_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || ''
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''

export type GoalActionType = 'create_task' | 'run_task' | 'update_prompt' | 'ship_fix'

export interface GoalAction {
  type: GoalActionType
  slug: string
  prompt: string
  priority: 'high' | 'med' | 'low'
  estimatedImpact: string
}

export interface GoalState {
  objective: string
  kpiTarget: Record<string, unknown>
  kpiCurrent: Record<string, unknown>
  gap: Record<string, number>
  recentRuns: { slug: string; status: string }[]
  signals: { qdrantPoints: number; contentCount: number; reportsCount: number }
}

interface GoalRow {
  slug: string
  objective: string
  kpiTarget: Record<string, unknown>
  kpiCurrent: Record<string, unknown>
  strategy?: Record<string, unknown> | null
  status: string
  iterations: number
  maxIter: number
}

const WORKING_REPORTS = path.join(process.cwd(), 'working', 'reports')

async function sendTelegram(text: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    // eslint-disable-next-line no-console
    console.log(`[GOAL][telegram] not configured; would send -> ${text.slice(0, 120)}`)
    return
  }
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'Markdown' }),
    })
  } catch {
    /* best-effort */
  }
}

function computeGap(target: Record<string, unknown>, current: Record<string, unknown>): Record<string, number> {
  const gap: Record<string, number> = {}
  for (const k of Object.keys(target)) {
    const t = Number(target[k])
    const c = Number(current[k] ?? 0)
    if (!Number.isNaN(t)) gap[k] = t - c
  }
  return gap
}

async function recentRuns(): Promise<{ slug: string; status: string }[]> {
  try {
    const logs = await prisma.taskRunLog.findMany({
      orderBy: { startedAt: 'desc' },
      take: 5,
      include: { task: { select: { slug: true } } },
    })
    return logs.map((l) => ({ slug: l.task?.slug ?? '?', status: l.status }))
  } catch {
    return []
  }
}

// Ollama-driven decision. Returns null on any failure so we fall back.
async function askModel(state: GoalState): Promise<{ reasoning: string; actions: GoalAction[]; kpiForecast: string } | null> {
  const sys = [
    'You are GoalRunner for hostamar.com, an autonomous growth agent.',
    `Objective: ${state.objective}`,
    `KPI target: ${JSON.stringify(state.kpiTarget)}`,
    `KPI current: ${JSON.stringify(state.kpiCurrent)}`,
    `Gap: ${JSON.stringify(state.gap)}`,
    `Signals: qdrantPoints=${state.signals.qdrantPoints}, contentCount=${state.signals.contentCount}, reportsCount=${state.signals.reportsCount}`,
    `Recent task runs: ${JSON.stringify(state.recentRuns)}`,
    'Available tools: [codeact, file_access, run_shell, qdrant, ollama, telegram, vercel].',
    'Available workers: 15 AutonomousTasks (seo-engine-weekly, content-pipeline-daily, chatbot-rag-sync, etc).',
    'Decide the NEXT 1-3 actions to close the gap. Prefer creating new targeted SEO/content tasks when contentCount is low.',
    'Output ONLY JSON: {"reasoning":string,"actions":[{"type":"create_task"|"run_task"|"update_prompt"|"ship_fix","slug":string,"prompt":string,"priority":"high"|"med"|"low","estimatedImpact":string}],"kpiForecast":string}',
  ].join('\n')

  try {
    const raw = await ollamaGenerate(sys, { temperature: 0.3, maxTokens: 900 })
    const m = raw.match(/\{[\s\S]*\}/)
    if (!m) return null
    const parsed = JSON.parse(m[0]) as {
      reasoning?: string
      actions?: GoalAction[]
      kpiForecast?: string
    }
    if (!Array.isArray(parsed.actions)) return null
    return {
      reasoning: parsed.reasoning || '',
      actions: parsed.actions.slice(0, 3),
      kpiForecast: parsed.kpiForecast || '',
    }
  } catch {
    return null
  }
}

// Deterministic fallback when Ollama is unavailable — still closes real gaps.
function heuristicDecision(state: GoalState): { reasoning: string; actions: GoalAction[]; kpiForecast: string } {
  const actions: GoalAction[] = []
  const gapMrr = Number(state.gap.mrr ?? 0)

  // Large MRR gap → we don't just make more content, we go outbound where the
  // ICP lives (Daraz sellers). Creates a targeted outbound task GoalRunner can
  // run; placeholders ({shopName},{topProduct}...) are filled from Qdrant.
  if (gapMrr > 50000) {
    actions.push({
      type: 'create_task',
      slug: 'outbound-daraz-seller-20',
      prompt:
        'Run outbound sequence working/outbound/sequence-1.json against 20 Daraz sellers (50+ orders/mo, FB 5k+). For each: research {shopName}/{productCount}/{topProduct} from Qdrant, render a 45s Bangla Loom, send Day1 email anchoring ৳8000+/mo of 5 tools vs ৳3500 all-in. Track replies as SupportEvent leads.',
      priority: 'high',
      estimatedImpact: `Close ৳${gapMrr.toLocaleString('en-IN')} MRR gap via ICP-1 Daraz outbound (৳3500/paying user)`,
    })
  }

  if (state.signals.contentCount < 5) {
    actions.push({
      type: 'create_task',
      slug: `seo-${slugify(String(state.kpiTarget.deadline || 'growth'))}-content`,
      prompt:
        'Write 2 Bengali SEO blog posts targeting "hostamar bkash hosting" and "bangla ai video maker" to drive Business-plan signups. Publish to content/blog/*.mdx and link from /pricing.',
      priority: 'high',
      estimatedImpact: 'Top-of-funnel SME traffic for Business plan',
    })
  }
  if (gapMrr > 0) {
    actions.push({
      type: 'run_task',
      slug: 'seo-engine-weekly',
      prompt: 'Run SEO audit now and surface the highest-impact on-page fixes for /pricing and /features to lift Business-plan conversion.',
      priority: 'high',
      estimatedImpact: 'Conversion lift on existing traffic',
    })
  }
  if (state.signals.qdrantPoints < 20) {
    actions.push({
      type: 'run_task',
      slug: 'chatbot-rag-sync',
      prompt: 'Re-sync support/Bangla knowledge into Qdrant so the RAG chatbot deflects billing tickets and improves trust signals.',
      priority: 'med',
      estimatedImpact: 'Higher trust/retention for paid users',
    })
  }
  if (actions.length === 0) {
    actions.push({
      type: 'run_task',
      slug: 'content-pipeline-daily',
      prompt: 'Continue daily content pipeline; maintain publishing cadence to sustain MRR growth.',
      priority: 'low',
      estimatedImpact: 'Sustained inbound',
    })
  }
  return {
    reasoning: 'Heuristic (Ollama unavailable): close gap by increasing content volume, forcing SEO audit, and keeping RAG fresh.',
    actions,
    kpiForecast: `Gap ৳${gapMrr.toLocaleString('en-IN')} remaining; actions target content + conversion.`,
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24)
}

export class GoalRunner {
  async tick(goalSlug: string): Promise<{ iteration: number; actions: GoalAction[]; achieved: boolean }> {
    await ensureHarnessSchema().catch(() => undefined)
    const row = (await prisma.goal.findUnique({ where: { slug: goalSlug } })) as GoalRow | null
    if (!row) {
      // eslint-disable-next-line no-console
      console.log(`[GOAL] no goal ${goalSlug}`)
      return { iteration: 0, actions: [], achieved: false }
    }
    if (row.status !== 'active') {
      return { iteration: row.iterations, actions: [], achieved: row.status === 'achieved' }
    }

    const metrics: MrRMetrics = await measureMRR()
    const kpiCurrent = {
      mrr: metrics.mrr,
      payingUsers: metrics.payingUsers,
      contentCount: metrics.contentCount,
      qdrantPoints: metrics.qdrantPoints,
      updatedAt: metrics.asOf,
    }
    const gap = computeGap(row.kpiTarget as Record<string, unknown>, kpiCurrent)
    const runs = await recentRuns()
    const state: GoalState = {
      objective: row.objective,
      kpiTarget: row.kpiTarget as Record<string, unknown>,
      kpiCurrent,
      gap,
      recentRuns: runs,
      signals: {
        qdrantPoints: metrics.qdrantPoints,
        contentCount: metrics.contentCount,
        reportsCount: metrics.reportsCount,
      },
    }

    const decision = (await askModel(state)) || heuristicDecision(state)
    const actions = decision.actions.slice(0, 3)

    for (const a of actions) {
      await this.applyAction(a).catch((e) => {
        // eslint-disable-next-line no-console
        console.log(`[GOAL] action ${a.type}/${a.slug} failed: ${e instanceof Error ? e.message : String(e)}`)
      })
    }

    const iteration = row.iterations + 1
    const achieved = (Number(kpiCurrent.mrr) >= Number((row.kpiTarget as Record<string, unknown>).mrr ?? 0))
    const gapMrr = Number(gap.mrr ?? 0)

    await prisma.goal.update({
      where: { slug: goalSlug },
      data: {
        iterations: iteration,
        kpiCurrent,
        status: achieved ? 'achieved' : 'active',
        updatedAt: new Date(),
        strategy: decision as unknown as Prisma.InputJsonValue,
      },
    }).catch(() => undefined)

    const report = {
      iteration,
      slug: goalSlug,
      objective: row.objective,
      kpiCurrent,
      gap,
      reasoning: decision.reasoning,
      actions,
      kpiForecast: decision.kpiForecast,
      achieved,
      at: new Date().toISOString(),
    }
    const date = new Date().toISOString().slice(0, 10)
    const reportPath = path.join(WORKING_REPORTS, `goal-${goalSlug}-${date}.json`)
    try {
      fs.mkdirSync(WORKING_REPORTS, { recursive: true })
      // Keep latest-per-day only; overwrite the day's file (idempotent tick).
      const prev = fs.readdirSync(WORKING_REPORTS)
        .filter((f) => f.startsWith(`goal-${goalSlug}-`) && f.endsWith('.json'))
        .map((f) => path.join(WORKING_REPORTS, f))
        .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
      for (const old of prev.slice(1)) fs.rmSync(old, { force: true })
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    } catch {
      /* best-effort */
    }

    const top = actions[0]
    const msg =
      `🎯 Goal *${goalSlug}* tick ${iteration}\n` +
      `Gap: ৳${gapMrr.toLocaleString('en-IN')} MRR / ${Number(gap.payingUsers ?? 0)} users\n` +
      `Actions: ${actions.length}\n` +
      `Forecast: ${decision.kpiForecast}\n` +
      `Next: ${top ? `${top.type} ${top.slug}` : 'none'}` +
      (achieved ? '\n✅ ACHIEVED' : '')
    await sendTelegram(msg)

    // eslint-disable-next-line no-console
    console.log(`[GOAL] ${goalSlug} tick ${iteration}: gap ৳${gapMrr} -> ${actions.length} actions; forecast=${decision.kpiForecast}`)
    return { iteration, actions, achieved }
  }

  private async applyAction(a: GoalAction): Promise<void> {
    switch (a.type) {
      case 'create_task': {
        // Upsert so re-ticks are idempotent (ON CONFLICT slug DO NOTHING).
        const existing = await prisma.autonomousTask.findUnique({ where: { slug: a.slug } }).catch(() => null)
        if (existing) return
        await prisma.autonomousTask.create({
          data: {
            slug: a.slug,
            owner: 'system',
            schedule: '0 */2 * * *',
            status: 'idle',
            enabled: true,
            configJson: {
              prompt: a.prompt,
              name: a.slug,
              autoApprove: true,
              tools: ['codeact', 'qdrant', 'file_access'],
            },
          },
        })
        // eslint-disable-next-line no-console
        console.log(`[GOAL] created task ${a.slug}`)
        return
      }
      case 'run_task': {
        await prisma.autonomousTask.updateMany({
          where: { slug: a.slug },
          data: { nextRunAt: new Date(), status: 'idle', enabled: true },
        })
        // eslint-disable-next-line no-console
        console.log(`[GOAL] bumped nextRunAt for ${a.slug}`)
        return
      }
      case 'update_prompt': {
        const task = await prisma.autonomousTask.findUnique({ where: { slug: a.slug } }).catch(() => null)
        if (!task) return
        const cfg = (task.configJson as Record<string, unknown>) || {}
        await prisma.autonomousTask.update({
          where: { slug: a.slug },
          data: { configJson: { ...cfg, prompt: a.prompt } },
        })
        // eslint-disable-next-line no-console
        console.log(`[GOAL] updated prompt for ${a.slug}`)
        return
      }
      case 'ship_fix': {
        // Trigger HarnessAgent directly with codeact. Imported lazily to avoid
        // pulling the full agent graph into the Inngest cold start unless needed.
        const { HarnessAgent } = await import('@/lib/harness/HarnessAgent')
        const agent = new HarnessAgent({ fileRoot: '/app/working' })
        await agent.execute({
          prompt: a.prompt,
          mode: 'execute',
          owner: 'system',
          autoApprove: true,
          fileRoot: '/app/working',
          taskSlug: a.slug,
          taskName: a.slug,
        })
        // eslint-disable-next-line no-console
        console.log(`[GOAL] shipped fix ${a.slug}`)
        return
      }
    }
  }
}
