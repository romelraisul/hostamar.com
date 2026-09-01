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
  // V26: chat product — Conversation + Message tables (prod predates them;
  // /api/chat/conversations self-heals on first authed call).
  `CREATE TABLE IF NOT EXISTS "Conversation" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL DEFAULT 'New conversation',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
)`,
  `CREATE INDEX IF NOT EXISTS "Conversation_userId_createdAt_idx" ON "Conversation"("userId","createdAt")`,
  `CREATE TABLE IF NOT EXISTS "Message" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "model" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
)`,
  `CREATE INDEX IF NOT EXISTS "Message_conversationId_idx" ON "Message"("conversationId")`,
  `CREATE INDEX IF NOT EXISTS "Message_conversationId_createdAt_idx" ON "Message"("conversationId","createdAt")`,
  // V21: cron-generated SEO blog posts (auto blog per new AI service)
  `CREATE TABLE IF NOT EXISTS "BlogPost" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "title" TEXT NOT NULL,
  "excerpt" TEXT,
  "metaDescription" TEXT,
  "keywords" TEXT[],
  "content" TEXT NOT NULL,
  "serviceId" TEXT,
  "authorId" TEXT,
  "published" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
)`,
  `CREATE INDEX IF NOT EXISTS "BlogPost_createdAt_idx" ON "BlogPost"("createdAt")`,
  `CREATE INDEX IF NOT EXISTS "BlogPost_serviceId_idx" ON "BlogPost"("serviceId")`,
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
  `CREATE TABLE IF NOT EXISTS "OpenSourceVideo" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "originalUrl" TEXT,
    "license" TEXT,
    "licenseUrl" TEXT,
    "duration" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "error" TEXT,
    "localPath" TEXT,
    "banglaPath" TEXT,
    "titleBn" TEXT,
    "addedToTv" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OpenSourceVideo_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "OpenSourceVideo_source_externalId_idx" ON "OpenSourceVideo"("source", "externalId")`,
  `CREATE INDEX IF NOT EXISTS "OpenSourceVideo_status_idx" ON "OpenSourceVideo"("status")`,
  // ── Ever-fresh TV: gender-aware dub metadata (additive, idempotent) ──
  `ALTER TABLE "OpenSourceVideo" ADD COLUMN IF NOT EXISTS "gender" TEXT`,
  `ALTER TABLE "OpenSourceVideo" ADD COLUMN IF NOT EXISTS "voiceUsed" TEXT`,
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
  // ── Free video hunter (Phase 4) ────────────────────────────────
  `CREATE TABLE IF NOT EXISTS "FreeVideoSource" (
  "id" TEXT NOT NULL,
  "product" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "titleBn" TEXT,
  "url" TEXT NOT NULL,
  "videoId" TEXT,
  "license" TEXT,
  "views" INTEGER,
  "duration" DOUBLE PRECISION,
  "viralScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "hook" TEXT,
  "scriptBn" TEXT,
  "translatedBy" TEXT,
  "localPath" TEXT,
  "used" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FreeVideoSource_pkey" PRIMARY KEY ("id")
)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "FreeVideoSource_url_key" ON "FreeVideoSource"("url")`,
  `CREATE INDEX IF NOT EXISTS "FreeVideoSource_product_idx" ON "FreeVideoSource"("product")`,
  `CREATE INDEX IF NOT EXISTS "FreeVideoSource_used_idx" ON "FreeVideoSource"("used")`,
  // ── Viral BD TV Engine (Phase 6) ───────────────────────────────
  `CREATE TABLE IF NOT EXISTS "ViralTrend" (
  "id" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "titleBn" TEXT,
  "url" TEXT,
  "thumbnail" TEXT,
  "views" INTEGER,
  "viralScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "category" TEXT,
  "rawData" JSONB,
  "used" BOOLEAN NOT NULL DEFAULT false,
  "videoCreated" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ViralTrend_pkey" PRIMARY KEY ("id")
)`,
  `CREATE INDEX IF NOT EXISTS "ViralTrend_source_idx" ON "ViralTrend"("source")`,
  `CREATE INDEX IF NOT EXISTS "ViralTrend_viralScore_idx" ON "ViralTrend"("viralScore")`,
  `CREATE INDEX IF NOT EXISTS "ViralTrend_used_videoCreated_idx" ON "ViralTrend"("used", "videoCreated")`,
  `CREATE TABLE IF NOT EXISTS "ViralVideo" (
  "id" TEXT NOT NULL,
  "viralTrendId" TEXT,
  "titleBn" TEXT NOT NULL,
  "hook" TEXT,
  "scriptBn" TEXT,
  "hashtags" TEXT,
  "category" TEXT,
  "videoUrl" TEXT NOT NULL,
  "hlsUrl" TEXT,
  "duration" INTEGER,
  "gender" TEXT,
  "voiceUsed" TEXT,
  "viralScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'READY',
  "playlistItemId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ViralVideo_pkey" PRIMARY KEY ("id")
)`,
  `CREATE INDEX IF NOT EXISTS "ViralVideo_viralTrendId_idx" ON "ViralVideo"("viralTrendId")`,
  `CREATE INDEX IF NOT EXISTS "ViralVideo_status_idx" ON "ViralVideo"("status")`,
  `CREATE TABLE IF NOT EXISTS "TvVideoStats" (
  "id" TEXT NOT NULL,
  "playlistItemId" TEXT NOT NULL,
  "viralTrendId" TEXT,
  "viralVideoId" TEXT,
  "title" TEXT,
  "views" INTEGER NOT NULL DEFAULT 0,
  "totalWatchSec" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "avgWatchPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "viralScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "isViral" BOOLEAN NOT NULL DEFAULT false,
  "playWeight" INTEGER NOT NULL DEFAULT 1,
  "lastViewAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TvVideoStats_pkey" PRIMARY KEY ("id")
)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "TvVideoStats_playlistItemId_key" ON "TvVideoStats"("playlistItemId")`,
  `CREATE INDEX IF NOT EXISTS "TvVideoStats_isViral_idx" ON "TvVideoStats"("isViral")`,
  `CREATE INDEX IF NOT EXISTS "TvVideoStats_viralScore_idx" ON "TvVideoStats"("viralScore")`,
  // ── Per-video SEO (every TV video gets its own Google-ranked page) ──
  `CREATE TABLE IF NOT EXISTS "TvVideoSeo" (
  "id" TEXT NOT NULL,
  "videoSourceId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "titleBn" TEXT NOT NULL,
  "metaDescription" TEXT NOT NULL,
  "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "transcriptBn" TEXT,
  "schemaJson" JSONB,
  "ogImage" TEXT,
  "canonicalUrl" TEXT NOT NULL,
  "product" TEXT NOT NULL,
  "viralScore" DOUBLE PRECISION,
  "views" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TvVideoSeo_pkey" PRIMARY KEY ("id")
)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "TvVideoSeo_videoSourceId_key" ON "TvVideoSeo"("videoSourceId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "TvVideoSeo_slug_key" ON "TvVideoSeo"("slug")`,
  `CREATE INDEX IF NOT EXISTS "TvVideoSeo_product_idx" ON "TvVideoSeo"("product")`,
  // ── In-house research (browser hunt → 100+ models gate) ──
  `ALTER TABLE "FreeVideoSource" ADD COLUMN IF NOT EXISTS "relevanceScore" DOUBLE PRECISION`,
  `CREATE TABLE IF NOT EXISTS "FreeVideoSourceResearch" (
  "id" TEXT NOT NULL,
  "videoSourceId" TEXT NOT NULL,
  "transcriptEn" TEXT,
  "visualDesc" TEXT,
  "relevanceScore" DOUBLE PRECISION,
  "category" TEXT,
  "summaryBn" TEXT,
  "keywords" TEXT[],
  "researchedBy" TEXT,
  "accepted" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FreeVideoSourceResearch_pkey" PRIMARY KEY ("id")
)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "FreeVideoSourceResearch_videoSourceId_key" ON "FreeVideoSourceResearch"("videoSourceId")`,
  `CREATE INDEX IF NOT EXISTS "FreeVideoSourceResearch_relevanceScore_idx" ON "FreeVideoSourceResearch"("relevanceScore")`,
  // ── No-repeat ever-fresh (played flag) ──
  `ALTER TABLE "TvPlaylistItem" ADD COLUMN IF NOT EXISTS "played" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "TvPlaylistItem" ADD COLUMN IF NOT EXISTS "playedAt" TIMESTAMP(3)`,
  `CREATE INDEX IF NOT EXISTS "TvPlaylistItem_played_idx" ON "TvPlaylistItem"("played")`,
  // ── Crypto tipping ──
  `CREATE TABLE IF NOT EXISTS "CryptoWallet" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "privateKeyEncrypted" TEXT NOT NULL,
  "chain" TEXT NOT NULL DEFAULT 'ethereum',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CryptoWallet_pkey" PRIMARY KEY ("id")
)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "CryptoWallet_address_key" ON "CryptoWallet"("address")`,
  `CREATE INDEX IF NOT EXISTS "CryptoWallet_userId_idx" ON "CryptoWallet"("userId")`,
  `CREATE TABLE IF NOT EXISTS "CryptoTip" (
  "id" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "fromAddress" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "txHash" TEXT,
  "message" TEXT,
  "videoSlug" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CryptoTip_pkey" PRIMARY KEY ("id")
)`,
  `CREATE INDEX IF NOT EXISTS "CryptoTip_walletId_idx" ON "CryptoTip"("walletId")`,
  `CREATE INDEX IF NOT EXISTS "CryptoTip_videoSlug_idx" ON "CryptoTip"("videoSlug")`,
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
