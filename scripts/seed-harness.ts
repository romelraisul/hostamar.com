// scripts/seed-harness.ts — seeds 6 AutonomousTasks and creates the Qdrant
// hostamar_memory collection. Run: tsx scripts/seed-harness.ts (needs DATABASE_URL
// + QDRANT_URL in the environment). Idempotent (upserts by slug).
import { PrismaClient } from '@prisma/client'
import { ensureHarnessSchema } from '../lib/harness/ensure-harness-schema'

const prisma = new PrismaClient()

const TASKS: {
  slug: string
  owner: string
  schedule: string
  prompt: string
}[] = [
  {
    slug: 'lead-scraper-system',
    owner: 'system',
    schedule: '*/10 * * * *',
    prompt: 'Research 3 bakery leads in Dhaka and generate an SEO report.',
  },
  {
    slug: 'content-factory-system',
    owner: 'system',
    schedule: '0 */2 * * *',
    prompt: 'Run an SEO audit on the Hostamar landing pages and score them with codeact.',
  },
  {
    slug: 'churn-guard-system',
    owner: 'system',
    schedule: '*/30 * * * *',
    prompt: 'Reconcile the bKash provisioning ledger and flag any unverified payments.',
  },
  {
    slug: 'customer-seo-auto',
    owner: 'system',
    schedule: '0 3 * * *',
    prompt: 'Generate a Bengali-first landing page for the Hosting product and save to working/.',
  },
  {
    slug: 'customer-social-auto',
    owner: 'system',
    schedule: '*/15 * * * *',
    prompt: 'Load hostamar-governance and verify no secret is logged and no rm -rf is queued.',
  },
  {
    slug: 'customer-backup-heal',
    owner: 'system',
    schedule: '0 0 * * *',
    prompt: 'Sync durable memory facts from today runs into the Foundry memory collection.',
  },
]

async function ensureQdrantCollection() {
  const url = process.env.QDRANT_URL || 'http://localhost:6333'
  try {
    const res = await fetch(`${url}/collections/hostamar_memory`, { method: 'GET' })
    if (res.ok) {
      console.log('[seed] Qdrant collection hostamar_memory already exists')
      return
    }
    const create = await fetch(`${url}/collections/hostamar_memory`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vectors: { size: 768, distance: 'Cosine' } }),
    })
    console.log('[seed] Qdrant hostamar_memory create ->', create.status)
  } catch (e) {
    console.log('[seed] Qdrant unreachable (skipping collection create):', (e as Error).message)
  }
}

async function main() {
  console.log('[seed] ensuring harness schema (autonomous_task / task_run_log / approval_queue / harness_session)...')
  await ensureHarnessSchema().catch((e) => {
    console.log('[seed] ensureHarnessSchema warning:', (e as Error).message)
  })
  console.log('[seed] ensuring Qdrant memory collection...')
  await ensureQdrantCollection()

  for (const t of TASKS) {
    const existing = await prisma.autonomousTask.findUnique({ where: { slug: t.slug } })
    if (existing) {
      await prisma.autonomousTask.update({
        where: { slug: t.slug },
        data: { schedule: t.schedule, configJson: { prompt: t.prompt }, owner: t.owner },
      })
      console.log('[seed] updated', t.slug)
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
      console.log('[seed] created', t.slug)
    }
  }

  const count = await prisma.autonomousTask.count()
  console.log(`[seed] done. AutonomousTask count = ${count}`)
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error('[seed] FAILED', e)
  await prisma.$disconnect()
  process.exit(1)
})
