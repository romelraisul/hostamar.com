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
