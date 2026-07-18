-- Migration: add support system (Tier1/2/3) tables.
-- Idempotent: guards with CREATE TABLE IF NOT EXISTS so it is safe to re-run.
-- Apply with: psql "$DATABASE_URL" -f prisma/migrations/add_support_tables/migration.sql

-- SupportEvent: every Tier1 automated check result / Tier2 escalation.
CREATE TABLE IF NOT EXISTS "SupportEvent" (
    "id" TEXT NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 1,
    "service" TEXT NOT NULL,
    "check" TEXT NOT NULL,
    "action" TEXT NOT NULL DEFAULT '',
    "result" TEXT NOT NULL DEFAULT 'pending',
    "detail" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SupportEvent_tier_createdAt_idx" ON "SupportEvent"("tier", "createdAt");
CREATE INDEX IF NOT EXISTS "SupportEvent_service_createdAt_idx" ON "SupportEvent"("service", "createdAt");

-- Incident: Tier3 incident response + on-call (created when a fix needs human
-- approval or is destructive). Timeline is stored as JSONB[].
CREATE TABLE IF NOT EXISTS "Incident" (
    "id" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'SEV2',
    "status" TEXT NOT NULL DEFAULT 'open',
    "service" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "timeline" JSONB[],
    "onCallCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Incident_status_severity_idx" ON "Incident"("status", "severity");
CREATE INDEX IF NOT EXISTS "Incident_createdAt_idx" ON "Incident"("createdAt");
