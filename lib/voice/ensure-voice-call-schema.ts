// Runtime self-heal for the VoiceCall table (pooled-Neon safe, mirrors
// ensure-goal-schema.ts). `prisma migrate dev` can't run against the Neon
// pooler here, so the app creates the table on first touch if missing.
import { prisma } from '@/lib/prisma'

let ensured = false

export async function ensureVoiceCallSchema(): Promise<void> {
  if (ensured) return
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "VoiceCall" (
        "id" TEXT NOT NULL,
        "userId" TEXT,
        "transcript" JSONB NOT NULL,
        "summary" TEXT,
        "actionItems" JSONB,
        "reportJson" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "VoiceCall_pkey" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "VoiceCall_createdAt_idx" ON "VoiceCall"("createdAt");
    `)
    ensured = true
  } catch (e) {
    // Table may already exist or DB unreachable (e.g. sandbox without Neon).
    // Swallow — callers degrade gracefully.
    if (String((e as any)?.message || '').includes('does not exist')) return
  }
}
