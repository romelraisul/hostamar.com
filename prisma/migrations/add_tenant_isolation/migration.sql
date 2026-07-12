-- =============================================================================
-- Migration: add_tenant_isolation
-- Tenant isolation (PR d). Organization = tenant (Decision A).
-- Video / Payment / VoiceCall get a nullable organizationId (backfilled from
-- Customer -> Membership.isDefault). Membership gets isDefault.
-- Goal / AutonomousTask / TaskRunLog are GLOBAL (Decision B) — intentionally
-- NOT touched.
--
-- Idempotent + zero-downtime: columns added nullable, then backfilled.
-- Keep nullable in THIS migration; a follow-up migration makes them NOT NULL
-- only after prod backfill is verified to have zero orphans.
-- =============================================================================

-- 1. Add columns (nullable, idempotent).
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN DEFAULT false;
ALTER TABLE "Video" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "VoiceCall" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

-- 2. Backfill isDefault: first membership per customer = default.
UPDATE "Membership" m
SET "isDefault" = true
WHERE id IN (
  SELECT DISTINCT ON ("customerId") id
  FROM "Membership"
  ORDER BY "customerId", "id" ASC
);

-- 3. Backfill Video/Payment organizationId via Customer -> Membership.isDefault.
UPDATE "Video" v
SET "organizationId" = m."organizationId"
FROM "Membership" m
WHERE v."customerId" = m."customerId"
  AND m."isDefault" = true
  AND v."organizationId" IS NULL;

UPDATE "Payment" p
SET "organizationId" = m."organizationId"
FROM "Membership" m
WHERE p."customerId" = m."customerId"
  AND m."isDefault" = true
  AND p."organizationId" IS NULL;

-- 4. VoiceCall.userId is the customerId alias — same backfill.
UPDATE "VoiceCall" vc
SET "organizationId" = m."organizationId"
FROM "Membership" m
WHERE vc."userId" = m."customerId"
  AND m."isDefault" = true
  AND vc."organizationId" IS NULL;

-- 5. Indexes.
CREATE INDEX IF NOT EXISTS "Video_organizationId_idx" ON "Video"("organizationId");
CREATE INDEX IF NOT EXISTS "Payment_organizationId_idx" ON "Payment"("organizationId");
CREATE INDEX IF NOT EXISTS "VoiceCall_organizationId_idx" ON "VoiceCall"("organizationId");
CREATE INDEX IF NOT EXISTS "Membership_customerId_isDefault_idx" ON "Membership"("customerId", "isDefault");

-- =============================================================================
-- TASK 5 — RLS (defense-in-depth, DISABLED by default on Vercel).
-- The app connects with one DB role, so RLS here is a safety net for the case
-- where a withTenant guard is missed — NOT a hard block. To enable hard
-- enforcement, set app.org_id per request:
--   prisma.$executeRaw`SELECT set_config('app.org_id', ${orgId}, true)`
-- then uncomment the policy below.
--
-- ALTER TABLE "Video" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "VoiceCall" ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "tenant_isolation_video" ON "Video"
--   USING ("organizationId" = current_setting('app.org_id', true)::text
--          OR current_setting('app.org_id', true) IS NULL);
-- CREATE POLICY "tenant_isolation_payment" ON "Payment"
--   USING ("organizationId" = current_setting('app.org_id', true)::text
--          OR current_setting('app.org_id', true) IS NULL);
-- CREATE POLICY "tenant_isolation_voicecall" ON "VoiceCall"
--   USING ("organizationId" = current_setting('app.org_id', true)::text
--          OR current_setting('app.org_id', true) IS NULL);
-- =============================================================================
