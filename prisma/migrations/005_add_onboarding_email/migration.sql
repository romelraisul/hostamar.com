-- Migration: Add OnboardingEmail table for email capture in onboarding V2
-- Stores only hashed emails (never raw). Idempotent upsert by email_hash.

BEGIN;

CREATE TABLE IF NOT EXISTS "OnboardingEmail" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "emailHash" TEXT NOT NULL UNIQUE,
  "source" TEXT DEFAULT 'onboarding',
  "optedIn" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_onboarding_email_hash" ON "OnboardingEmail" ("emailHash");

COMMIT;
