// scripts/seed-harness-blueprint.ts — seeds 6 NEW blueprint-aligned
// AutonomousTasks (hostamar.txt guideline) on top of the existing 6.
// Idempotent (upserts by slug). Run inside the app container:
//   docker exec hostamar-app node .../seed-harness-blueprint.js (tsx)
import { PrismaClient } from '@prisma/client'
import { ensureHarnessSchema } from '../lib/harness/ensure-harness-schema'

const prisma = new PrismaClient()

// 6 tasks mapped 1:1 to hostamar.txt sections, kept at $0 (self-hosted Ollama,
// system-owned => autoApprove=true in the runner => no human cost).
const TASKS: {
  slug: string
  owner: string
  schedule: string
  prompt: string
}[] = [
  {
    slug: 'bp-content-pipeline',
    owner: 'system',
    schedule: '0 */2 * * *',
    prompt:
      'Hostamar blueprint §Content Pipeline (GEO/AI-first): research 3 bakery/hosting leads in Dhaka, draft a Bengali-first SEO article into working/content/, and score it with the codeact seo_score tool. Save the report to working/reports/.',
  },
  {
    slug: 'bp-seo-geo-audit',
    owner: 'system',
    schedule: '0 4 * * *',
    prompt:
      'Hostamar blueprint §SEO/GEO (AI-Search Optimization): run a GEO/AI-SEO audit on the Hostamar landing pages, check schema + AI-overview readiness, and write the scorecard to working/reports/seo-geo-audit.md.',
  },
  {
    slug: 'bp-chatbot-rag',
    owner: 'system',
    schedule: '*/30 * * * *',
    prompt:
      'Hostamar blueprint §Chatbot/RAG: ingest the latest working/content/*.md into the Qdrant hostamar_memory collection and verify the support chatbot retrieval returns grounded answers. Log gaps to working/reports/rag-sync.md.',
  },
  {
    slug: 'bp-analytics-bi',
    owner: 'system',
    schedule: '0 2 * * *',
    prompt:
      'Hostamar blueprint §Analytics/BI: pull the last 24h ApprovalQueue + TaskRunLog metrics from Postgres, compute autonomous-task success rate and pending-approval backlog, and write a dashboard summary to working/reports/analytics-daily.md.',
  },
  {
    slug: 'bp-security-governance',
    owner: 'system',
    schedule: '*/15 * * * *',
    prompt:
      'Hostamar blueprint §Security/Governance: scan today\'s queued harness approvals and TaskRunLogs for leaked secrets, rm -rf, or destructive commands; if any are found block them and alert via Telegram. Write a governance report to working/reports/governance-scan.md.',
  },
  {
    slug: 'bp-dr-monitoring',
    owner: 'system',
    schedule: '0 0 * * *',
    prompt:
      'Hostamar blueprint §Backup/DR + Monitoring: verify Postgres + Qdrant + Ollama are reachable, confirm the Cloudflare tunnel primary is healthy (x-served-by computer-primary), and write a DR/health report to working/reports/dr-monitor.md. Alert via Telegram if any check fails.',
  },
]

async function main() {
  console.log('[bp-seed] ensuring harness schema...')
  await ensureHarnessSchema().catch((e) => console.log('[bp-seed] warn', (e as Error).message))

  for (const t of TASKS) {
    const existing = await prisma.autonomousTask.findUnique({ where: { slug: t.slug } })
    if (existing) {
      await prisma.autonomousTask.update({
        where: { slug: t.slug },
        data: { schedule: t.schedule, configJson: { prompt: t.prompt }, owner: t.owner, enabled: true },
      })
      console.log('[bp-seed] updated', t.slug)
    } else {
      await prisma.autonomousTask.create({
        data: {
          id: t.slug,
          slug: t.slug,
          owner: t.owner,
          schedule: t.schedule,
          configJson: { prompt: t.prompt },
          enabled: true,
          status: 'idle',
        },
      })
      console.log('[bp-seed] created', t.slug)
    }
  }

  const count = await prisma.autonomousTask.count()
  console.log(`[bp-seed] done. AutonomousTask count = ${count}`)
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error('[bp-seed] FAILED', e)
  await prisma.$disconnect()
  process.exit(1)
})
