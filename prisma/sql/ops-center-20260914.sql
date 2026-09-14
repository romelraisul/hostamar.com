-- V70 Employee Ops Center — ADDITIVE DDL (2026-09-14)
-- Applied to live Neon via:  npx prisma db execute --stdin --schema prisma/schema.prisma < prisma/sql/ops-center-20260914.sql
-- Idempotent (IF NOT EXISTS). Also self-healed at runtime by lib/ops-events.ts.
CREATE TABLE IF NOT EXISTS "FleetEvent" (
  "id" TEXT NOT NULL,
  "lane" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'info',
  "title" TEXT NOT NULL,
  "body" TEXT,
  "meta" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FleetEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "FleetEvent_createdAt_idx" ON "FleetEvent"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "FleetEvent_lane_createdAt_idx" ON "FleetEvent"("lane","createdAt" DESC);

CREATE TABLE IF NOT EXISTS "FleetControl" (
  "id" TEXT NOT NULL,
  "employee" TEXT NOT NULL,
  "paused" BOOLEAN NOT NULL DEFAULT false,
  "autonomy" TEXT NOT NULL DEFAULT 'autonomous',
  "note" TEXT,
  "updatedBy" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FleetControl_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FleetControl_employee_key" ON "FleetControl"("employee");

CREATE TABLE IF NOT EXISTS "FleetLaneStatus" (
  "id" TEXT NOT NULL,
  "employee" TEXT NOT NULL,
  "role" TEXT,
  "schedule" TEXT,
  "lastRunAt" TIMESTAMP(3),
  "verdict" TEXT,
  "streak" INTEGER NOT NULL DEFAULT 0,
  "lastSnippet" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FleetLaneStatus_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FleetLaneStatus_employee_key" ON "FleetLaneStatus"("employee");
