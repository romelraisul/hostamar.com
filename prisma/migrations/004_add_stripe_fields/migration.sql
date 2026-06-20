-- Add Stripe customer ID and billing fields to Customer table
BEGIN;

ALTER TABLE "Customer"
  ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT,
  ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMPTZ;

ALTER TABLE "Subscription"
  ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripePriceId" TEXT;

COMMIT;
