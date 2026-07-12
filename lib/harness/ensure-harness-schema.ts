// ============================================================================
// Runtime schema guard (Harness) — creates AutonomousTask / TaskRunLog /
// ApprovalQueue / HarnessSession tables if missing. Same rationale + pattern as
// lib/ensure-schema.ts: build sandbox can't reach Neon, pooled URL rejects DDL,
// so create lazily at runtime. Idempotent, cached per cold start, with a
// pooled->direct fallback. One statement per $executeRawUnsafe call.
// ============================================================================
import { PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "AutonomousTask" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "owner" TEXT NOT NULL DEFAULT 'system',
  "schedule" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "lastRunAt" TIMESTAMP(3),
  "nextRunAt" TIMESTAMP(3),
  "configJson" JSONB,
  "status" TEXT NOT NULL DEFAULT 'idle',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AutonomousTask_pkey" PRIMARY KEY ("id")
)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "AutonomousTask_slug_key" ON "AutonomousTask"("slug")`,
  `CREATE INDEX IF NOT EXISTS "AutonomousTask_enabled_nextRunAt_idx" ON "AutonomousTask"("enabled","nextRunAt")`,
  `CREATE TABLE IF NOT EXISTS "TaskRunLog" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'running',
  "outputJson" JSONB,
  "error" TEXT,
  "approvalId" TEXT,
  CONSTRAINT "TaskRunLog_pkey" PRIMARY KEY ("id")
)`,
  `CREATE INDEX IF NOT EXISTS "TaskRunLog_taskId_startedAt_idx" ON "TaskRunLog"("taskId","startedAt")`,
  `CREATE TABLE IF NOT EXISTS "ApprovalQueue" (
  "id" TEXT NOT NULL,
  "toolName" TEXT NOT NULL,
  "argsJson" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt" TIMESTAMP(3),
  CONSTRAINT "ApprovalQueue_pkey" PRIMARY KEY ("id")
)`,
  `CREATE INDEX IF NOT EXISTS "ApprovalQueue_status_idx" ON "ApprovalQueue"("status")`,
  `CREATE INDEX IF NOT EXISTS "ApprovalQueue_createdAt_idx" ON "ApprovalQueue"("createdAt")`,
  `CREATE TABLE IF NOT EXISTS "HarnessSession" (
  "id" TEXT NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'plan',
  "todosJson" JSONB,
  "memoryRef" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HarnessSession_pkey" PRIMARY KEY ("id")
)`,
  `CREATE INDEX IF NOT EXISTS "HarnessSession_createdAt_idx" ON "HarnessSession"("createdAt")`,
]

let ensured: Promise<void> | null = null

async function tryCreate(client: PrismaClient | typeof prisma): Promise<void> {
  for (const sql of STATEMENTS) {
    await client.$executeRawUnsafe(sql)
  }
}

export function ensureHarnessSchema(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      try {
        await tryCreate(prisma)
      } catch (pooledErr) {
        const pooled = process.env.DATABASE_URL || ''
        if (pooled.includes('-pooler')) {
          const direct = pooled.replace('-pooler', '')
          const directClient = new PrismaClient({
            datasources: { db: { url: direct } },
          })
          try {
            await tryCreate(directClient)
          } finally {
            await directClient.$disconnect().catch(() => undefined)
          }
        } else {
          throw pooledErr
        }
      }
    })().catch((e) => {
      ensured = null
      throw e
    })
  }
  return ensured
}
