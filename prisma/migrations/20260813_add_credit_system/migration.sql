-- Credit System Migration
-- Adds CreditAccount and CreditTransaction tables for per-product credit tracking.

BEGIN;

CREATE TABLE IF NOT EXISTS "CreditAccount" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "customerId" TEXT NOT NULL UNIQUE,
  credits INTEGER NOT NULL DEFAULT 0,
  consumed INTEGER NOT NULL DEFAULT 0,
  "videoCredits" INTEGER NOT NULL DEFAULT 0,
  "imageCredits" INTEGER NOT NULL DEFAULT 0,
  "chatCredits" INTEGER NOT NULL DEFAULT 0,
  "browserCredits" INTEGER NOT NULL DEFAULT 0,
  "ideCredits" INTEGER NOT NULL DEFAULT 0,
  "gameCredits" INTEGER NOT NULL DEFAULT 0,
  "hostingCredits" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CreditTransaction" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "accountId" TEXT NOT NULL,
  amount INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  product TEXT NOT NULL DEFAULT 'bonus',
  metadata JSONB,
  description TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "CreditAccount_customerId_idx" ON "CreditAccount"("customerId");
CREATE INDEX IF NOT EXISTS "CreditTransaction_accountId_createdAt_idx" ON "CreditTransaction"("accountId", "createdAt");
CREATE INDEX IF NOT EXISTS "CreditTransaction_product_idx" ON "CreditTransaction"(product);

ALTER TABLE "CreditAccount" ADD CONSTRAINT "CreditAccount_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CreditAccount"(id) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
