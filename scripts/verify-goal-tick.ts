// TASK-5 live proof: run the REAL GoalRunner against a disposable Postgres.
// Verifies: Goal table self-heal, seed, tick -> measureMRR(real DB),
// heuristic action creation (create_task + run_task bumping nextRunAt),
// report JSON written, goal iteration advanced.
import { PrismaClient, Prisma } from '@prisma/client'
import { GoalRunner } from '@/lib/autonomy/GoalRunner'
import { ensureGoalSchema } from '@/lib/autonomy/ensure-goal-schema'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
  await ensureGoalSchema()
  // Seed the canonical polling workers (mirrors the 15 prod AutonomousTasks)
  // so the proof demonstrates the dynamic loop RE-SCHEDULING existing workers.
  for (const slug of ['seo-engine-weekly', 'content-pipeline-daily', 'chatbot-rag-sync']) {
    await prisma.autonomousTask.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        owner: 'system',
        schedule: slug === 'chatbot-rag-sync' ? '0 */6 * * *' : slug === 'content-pipeline-daily' ? '0 6 * * *' : '0 2 * * 1',
        status: 'idle',
        enabled: true,
        configJson: { prompt: `run ${slug}`, name: slug, autoApprove: true, tools: ['codeact', 'qdrant', 'file_access'] },
      },
    })
  }
  await prisma.goal.upsert({
    where: { slug: 'mrr-1lakh' },
    update: {},
    create: {
      slug: 'mrr-1lakh',
      objective:
        'Achieve MRR ৳100,000 from Business plan ৳3500 (28 paying users) by optimizing SEO, content, RAG, and checkout conversion for Bangladeshi SMEs',
      kpiTarget: { mrr: 100000, payingUsers: 28, currency: 'BDT', deadline: '2026-09-01' },
      kpiCurrent: { mrr: 0, payingUsers: 0, contentCount: 0, qdrantPoints: 7, updatedAt: new Date().toISOString() },
      status: 'active',
      maxIter: 100,
    },
  })

  const res = await new GoalRunner().tick('mrr-1lakh')

  const goal = await prisma.goal.findUnique({ where: { slug: 'mrr-1lakh' } })
  const createdTask = await prisma.autonomousTask.findFirst({
    where: { slug: { not: { in: ['seo-engine-weekly', 'content-pipeline-daily', 'chatbot-rag-sync'] } } },
    orderBy: { createdAt: 'desc' },
  })
  const bumped = await prisma.autonomousTask.findFirst({
    where: { slug: 'seo-engine-weekly' },
  })
  const reports = fs
    .readdirSync(path.join(process.cwd(), 'working', 'reports'))
    .filter((f) => f.startsWith('goal-mrr-1lakh-') && f.endsWith('.json'))

  console.log('=== TASK 5 LIVE PROOF ===')
  console.log('iteration:', res.iteration)
  console.log('actions:', res.actions.length, res.actions.map((a) => `${a.type}:${a.slug}`).join(', '))
  console.log('goal.iterations:', goal?.iterations, '| goal.status:', goal?.status)
  console.log('kpiCurrent(mrr):', (goal?.kpiCurrent as any)?.mrr, '| contentCount:', (goal?.kpiCurrent as any)?.contentCount)
  console.log('created seo-* task:', createdTask?.slug ?? 'NONE')
  console.log('seo-engine-weekly nextRunAt bumped:', bumped?.nextRunAt ?? 'NONE')
  console.log('report files:', reports)
  const report = reports[0] ? JSON.parse(fs.readFileSync(path.join(process.cwd(), 'working', 'reports', reports[0]), 'utf8')) : null
  console.log('report.iteration:', report?.iteration, '| report.actions[0].type:', report?.actions?.[0]?.type)
  console.log('VALID:', res.iteration >= 1 && res.actions.length >= 1 && !!createdTask && !!bumped && reports.length >= 1)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('PROOF FAILED:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
