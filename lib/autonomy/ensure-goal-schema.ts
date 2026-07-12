// ============================================================================
// Runtime schema guard (Goal) — creates the Goal table if missing. Same
// rationale as the harness guard: `prisma migrate deploy` cannot run against
// the pooled Neon URL from the build sandbox, so the table is created lazily
// at runtime (first goal-tick). Idempotent, cached per cold start, with a
// pooled -> direct fallback. One statement per $executeRawUnsafe call.
// ============================================================================
import { PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "Goal" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "objective" TEXT NOT NULL,
  "kpiTarget" JSONB NOT NULL,
  "kpiCurrent" JSONB NOT NULL,
  "strategy" JSONB,
  "status" TEXT NOT NULL DEFAULT 'active',
  "iterations" INTEGER NOT NULL DEFAULT 0,
  "maxIter" INTEGER NOT NULL DEFAULT 100,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Goal_slug_key" ON "Goal"("slug")`,
  `CREATE INDEX IF NOT EXISTS "Goal_status_idx" ON "Goal"("status")`,
]

let ensured: Promise<void> | null = null

async function tryCreate(client: PrismaClient | typeof prisma): Promise<void> {
  for (const sql of STATEMENTS) {
    await client.$executeRawUnsafe(sql)
  }
}

export function ensureGoalSchema(): Promise<void> {
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
