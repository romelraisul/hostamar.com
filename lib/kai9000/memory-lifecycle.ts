/**
 * memory-lifecycle.ts — V8 Phase B. Persistent per-user memory for pinned chat.
 * Real storage: Conversation.memories / hitCountMap / promotedPrompt via
 * idempotent runtime DDL (repo pattern — no migrate against prod Neon).
 * Promotion rule: a fact repeated 5+ times in the user's Message history
 * gets appended to promotedPrompt, which pinnedChatMessage injects.
 */
import prisma from '@/lib/prisma'

let ensured = false
export async function ensureMemorySchema(): Promise<void> {
  if (ensured) return
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "memories" JSONB DEFAULT '{}'`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "hitCountMap" JSONB DEFAULT '{}'`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "promotedPrompt" TEXT DEFAULT ''`)
  } catch {}
  ensured = true
}

async function latestConversationId(userId: string): Promise<string | null> {
  const rows: any[] = await prisma.$queryRaw`SELECT id FROM "Conversation" WHERE "userId" = ${userId} ORDER BY "updatedAt" DESC LIMIT 1`
  return Array.isArray(rows) && rows[0] ? rows[0].id : null
}

/** Count user messages containing a key (case-insensitive, last 200). */
export async function countRepetitions(userId: string, key: string): Promise<number> {
  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS n FROM (
        SELECT content FROM "Message" WHERE "userId" = ${userId}
        ORDER BY "createdAt" DESC LIMIT 200
      ) m WHERE m.content ILIKE ${'%' + key + '%'}` as any[]
    return Array.isArray(rows) && rows[0] ? Number(rows[0].n || 0) : 0
  } catch { return 0 }
}

/**
 * Track a candidate fact; promote to promotedPrompt at >=5 repetitions.
 * Returns true when newly promoted.
 */
export async function trackAndMaybePromote(userId: string, key: string, factText: string): Promise<boolean> {
  await ensureMemorySchema()
  const convId = await latestConversationId(userId)
  if (!convId) return false
  const n = await countRepetitions(userId, key)
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "Conversation" SET "hitCountMap" = COALESCE("hitCountMap",'{}'::jsonb) || jsonb_build_object('${key.replace(/'/g, '')}', ${n}) WHERE id = '${convId}'`
    )
  } catch {}
  if (n < 5) return false
  try {
    const cur: any[] = await prisma.$queryRaw`SELECT "promotedPrompt" FROM "Conversation" WHERE id = ${convId}`
    const existing = (Array.isArray(cur) && cur[0] ? String(cur[0].promotedPrompt || '') : '')
    if (existing.includes(factText)) return false
    const next = (existing ? existing + '\n' : '') + factText
    await prisma.$executeRawUnsafe(`UPDATE "Conversation" SET "promotedPrompt" = '${next.replace(/'/g, "''")}' WHERE id = '${convId}'`)
    return true
  } catch { return false }
}

/** Promoted memory block for systemPrompt injection (empty string = none). */
export async function getPromotedPrompt(userId: string): Promise<string> {
  await ensureMemorySchema()
  try {
    const rows: any[] = await prisma.$queryRaw`SELECT "promotedPrompt" FROM "Conversation" WHERE "userId" = ${userId} ORDER BY "updatedAt" DESC LIMIT 1`
    const p = Array.isArray(rows) && rows[0] ? String(rows[0].promotedPrompt || '') : ''
    return p.trim() ? `User facts to remember:\n${p.trim()}` : ''
  } catch { return '' }
}
