// ============================================================================
// Runtime schema guard (B) — creates the ProvisioningLedger table if missing.
// Build-time `prisma migrate deploy` cannot run here: the Vercel build sandbox
// cannot reach the DB, and the pooled URL rejects DDL. The server runtime CAN
// reach the DB, so we create the table lazily on first use. Idempotent and
// cached per cold start. Falls back to a direct (non-pooled) connection if the
// pooled one rejects the DDL.
//
// NOTE: Prisma's $executeRawUnsafe uses a PREPARED statement, which only
// accepts a SINGLE command. Multiple statements in one call fail with
// 42601 "cannot insert multiple commands into a prepared statement". So every
// DDL statement is executed separately.
// ============================================================================
import { PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'

// One statement per entry — never concatenate.
const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "ProvisioningLedger" (
  "id" TEXT NOT NULL,
  "tranId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "customerEmail" TEXT NOT NULL,
  "plan" TEXT NOT NULL,
  "amount" INTEGER,
  "gateway" TEXT,
  "rawPayload" JSONB,
  "accountId" TEXT,
  "loginUrl" TEXT,
  "provisionedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProvisioningLedger_pkey" PRIMARY KEY ("id")
)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ProvisioningLedger_tranId_key" ON "ProvisioningLedger"("tranId")`,
  `CREATE INDEX IF NOT EXISTS "ProvisioningLedger_customerEmail_idx" ON "ProvisioningLedger"("customerEmail")`,
  `CREATE INDEX IF NOT EXISTS "ProvisioningLedger_status_idx" ON "ProvisioningLedger"("status")`,
  // ── Personal Send-Money payments (Phase 2) ──────────────────────
  `CREATE TABLE IF NOT EXISTS "PaymentVerification" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "senderNumber" TEXT NOT NULL,
  "trxId" TEXT NOT NULL,
  "plan" TEXT,
  "credits" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "smsMatched" BOOLEAN NOT NULL DEFAULT false,
  "reviewedBy" TEXT,
  "reviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "verifiedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentVerification_pkey" PRIMARY KEY ("id")
)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "PaymentVerification_trxId_key" ON "PaymentVerification"("trxId")`,
  `CREATE INDEX IF NOT EXISTS "PaymentVerification_customerId_idx" ON "PaymentVerification"("customerId")`,
  `CREATE INDEX IF NOT EXISTS "PaymentVerification_status_idx" ON "PaymentVerification"("status")`,
  `CREATE TABLE IF NOT EXISTS "SmsLog" (
  "id" TEXT NOT NULL,
  "rawSms" TEXT NOT NULL,
  "provider" TEXT,
  "parsedAmount" DOUBLE PRECISION,
  "parsedTrxId" TEXT,
  "senderNumber" TEXT,
  "balance" DOUBLE PRECISION,
  "matched" BOOLEAN NOT NULL DEFAULT false,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SmsLog_pkey" PRIMARY KEY ("id")
)`,
  `CREATE INDEX IF NOT EXISTS "SmsLog_parsedTrxId_idx" ON "SmsLog"("parsedTrxId")`,
  `CREATE INDEX IF NOT EXISTS "SmsLog_receivedAt_idx" ON "SmsLog"("receivedAt")`,
  // ── Affiliate program + user webhooks (Phase 3) ─────────────────
  `CREATE TABLE IF NOT EXISTS "AffiliateCommission" (
  "id" TEXT NOT NULL,
  "affiliateId" TEXT NOT NULL,
  "fromCustomerId" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "rate" DOUBLE PRECISION NOT NULL DEFAULT 0.20,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidAt" TIMESTAMP(3),
  CONSTRAINT "AffiliateCommission_pkey" PRIMARY KEY ("id")
)`,
  `CREATE INDEX IF NOT EXISTS "AffiliateCommission_affiliateId_status_idx" ON "AffiliateCommission"("affiliateId", "status")`,
  `CREATE INDEX IF NOT EXISTS "AffiliateCommission_sourceId_idx" ON "AffiliateCommission"("sourceId")`,
  `CREATE TABLE IF NOT EXISTS "UserWebhook" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "secret" TEXT NOT NULL,
  "events" TEXT NOT NULL DEFAULT 'video.completed',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastStatus" INTEGER,
  "lastSentAt" TIMESTAMP(3),
  "failCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserWebhook_pkey" PRIMARY KEY ("id")
)`,
  `CREATE INDEX IF NOT EXISTS "UserWebhook_customerId_idx" ON "UserWebhook"("customerId")`,
  // ── Team workspace invites (Phase 3) ────────────────────────────
  `CREATE TABLE IF NOT EXISTS "TeamInvite" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member',
  "token" TEXT NOT NULL,
  "invitedBy" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeamInvite_pkey" PRIMARY KEY ("id")
)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "TeamInvite_token_key" ON "TeamInvite"("token")`,
  `CREATE INDEX IF NOT EXISTS "TeamInvite_organizationId_idx" ON "TeamInvite"("organizationId")`,
  `CREATE INDEX IF NOT EXISTS "TeamInvite_email_idx" ON "TeamInvite"("email")`,
  // ── 24/7 AI TV Station (Phase 4) ────────────────────────────────
  `CREATE TABLE IF NOT EXISTS "TvChannel" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isLive" BOOLEAN NOT NULL DEFAULT false,
  "liveSince" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TvChannel_pkey" PRIMARY KEY ("id")
)`,
  `CREATE TABLE IF NOT EXISTS "TvPlaylistItem" (
  "id" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "videoId" TEXT,
  "title" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'generated',
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TvPlaylistItem_pkey" PRIMARY KEY ("id")
)`,
  `CREATE INDEX IF NOT EXISTS "TvPlaylistItem_channelId_position_idx" ON "TvPlaylistItem"("channelId", "position")`,
  `CREATE TABLE IF NOT EXISTS "TvStreamDestination" (
  "id" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "rtmpUrl" TEXT NOT NULL,
  "streamKey" TEXT NOT NULL,
  "label" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TvStreamDestination_pkey" PRIMARY KEY ("id")
)`,
  `CREATE INDEX IF NOT EXISTS "TvStreamDestination_channelId_idx" ON "TvStreamDestination"("channelId")`,
  `CREATE TABLE IF NOT EXISTS "TvSchedule" (
  "id" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "promptTemplate" TEXT NOT NULL,
  "style" TEXT NOT NULL DEFAULT 'cinematic',
  "cron" TEXT NOT NULL DEFAULT '*/30 * * * *',
  "lastRun" TIMESTAMP(3),
  "nextRun" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TvSchedule_pkey" PRIMARY KEY ("id")
)`,
  `CREATE INDEX IF NOT EXISTS "TvSchedule_channelId_idx" ON "TvSchedule"("channelId")`,
  // ── TV Agent + Admin Control (Phase 5) ─────────────────────────
  `CREATE TABLE IF NOT EXISTS "TvSettings" (
  "id" TEXT NOT NULL,
  "channelName" TEXT NOT NULL DEFAULT 'Hostamar TV',
  "hlsUrl" TEXT,
  "rtmpUrl" TEXT DEFAULT 'rtmp://localhost:1935/live/tv',
  "tunnelAutoUrl" TEXT,
  "autoGenerate" BOOLEAN NOT NULL DEFAULT true,
  "rssFeeds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TvSettings_pkey" PRIMARY KEY ("id")
)`,
  `CREATE TABLE IF NOT EXISTS "TvCommand" (
  "id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "payload" JSONB,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "executedAt" TIMESTAMP(3),
  CONSTRAINT "TvCommand_pkey" PRIMARY KEY ("id")
)`,
  `CREATE INDEX IF NOT EXISTS "TvCommand_status_createdAt_idx" ON "TvCommand"("status", "createdAt")`,
  `CREATE TABLE IF NOT EXISTS "TvLog" (
  "id" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TvLog_pkey" PRIMARY KEY ("id")
)`,
  `CREATE INDEX IF NOT EXISTS "TvLog_createdAt_idx" ON "TvLog"("createdAt")`,
]

let ensured: Promise<void> | null = null

async function tryCreate(client: PrismaClient | typeof prisma): Promise<void> {
  for (const sql of STATEMENTS) {
    await client.$executeRawUnsafe(sql)
  }
}

export function ensureSchema(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      try {
        await tryCreate(prisma)
      } catch (pooledErr) {
        // Pooled/transaction-mode connection may reject DDL — retry on the
        // direct (non-pooled) endpoint with the same credentials.
        const pooled = env.DATABASE_URL || ''
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
      ensured = null // allow retry on next request
      throw e
    })
  }
  return ensured
}
