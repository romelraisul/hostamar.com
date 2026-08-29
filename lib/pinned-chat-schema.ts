/**
 * Pinned-chat runtime schema ensure (no prisma db push against prod —
 * this repo applies schema changes via idempotent DDL at deploy/runtime).
 * Creates: ServiceOrder extra columns, ServiceChat, ServiceChatMessage.
 */
import prisma from '@/lib/prisma'

let ensured = false
export async function ensurePinnedChatSchema(): Promise<void> {
  if (ensured) return
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "ServiceOrder" ADD COLUMN IF NOT EXISTS "missingFields" JSONB`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "ServiceOrder" ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN DEFAULT true`)
  } catch {}
  try {
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "ServiceChat" (id TEXT PRIMARY KEY, "orderId" TEXT UNIQUE NOT NULL, "userId" TEXT NOT NULL, "isPinned" BOOLEAN DEFAULT true, title TEXT NOT NULL, "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP)`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ServiceChat_userId_idx" ON "ServiceChat"("userId")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ServiceChat_isPinned_idx" ON "ServiceChat"("isPinned")`)
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "ServiceChatMessage" (id TEXT PRIMARY KEY, "chatId" TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, attachments JSONB, "creditCost" INTEGER, "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP)`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ServiceChatMessage_chatId_idx" ON "ServiceChatMessage"("chatId")`)
  } catch {}
  ensured = true
}
