-- PIN2-5 decision columns + PIN6 receipts.
-- Applied 2026-10-09 to Turso (prod) and to local docker postgres schema-by-parity.
-- sqlite/libsql dialect: no IF NOT EXISTS on ADD COLUMN -> apply once.
-- Applied with: turso db shell hostamar-db < this file
-- To re-apply elsewhere (skips existing objects): cp this file /tmp/turso-ddl.sql && node scripts/apply-turso-ddl.js
-- NOTE: these are NOT the tables the brief assumed. The real homes are:
--   PIN2 incoming requests  -> "HostingRequest"  (status queued|provisioning|running|failed)
--   PIN3 terraform PR gate  -> "ApprovalQueue"   (pending|approved|denied)
--   PIN4 system health      -> "Incident"        (severity|status|service)
--   PIN5 abuse check        -> "RateLimitEvent"  (ip|path)
--   incoming_requests / terraform_prs / system_health / traffic_logs DO NOT EXIST.

-- PIN2 Inbox Lead Router
ALTER TABLE "HostingRequest" ADD COLUMN "decision_queue" TEXT;
ALTER TABLE "HostingRequest" ADD COLUMN "decision_confidence" REAL;
ALTER TABLE "HostingRequest" ADD COLUMN "needs_review" BOOLEAN DEFAULT false;
ALTER TABLE "HostingRequest" ADD COLUMN "decision_judge1" TEXT;
ALTER TABLE "HostingRequest" ADD COLUMN "decision_judge2" TEXT;
ALTER TABLE "HostingRequest" ADD COLUMN "decision_agree" BOOLEAN;
ALTER TABLE "HostingRequest" ADD COLUMN "decision_receipt_id" TEXT;

-- PIN3 Terraform PR Gate
ALTER TABLE "ApprovalQueue" ADD COLUMN "decision_approval_required" BOOLEAN;
ALTER TABLE "ApprovalQueue" ADD COLUMN "decision_confidence" REAL;
ALTER TABLE "ApprovalQueue" ADD COLUMN "decision_tf_diff" TEXT;
ALTER TABLE "ApprovalQueue" ADD COLUMN "decision_cost_delta" REAL;

-- PIN4 System Health Priority Scorer
ALTER TABLE "Incident" ADD COLUMN "decision_priority" TEXT;
ALTER TABLE "Incident" ADD COLUMN "decision_confidence" REAL;
ALTER TABLE "Incident" ADD COLUMN "decision_downtime" INTEGER;
ALTER TABLE "Incident" ADD COLUMN "decision_reboot_history" INTEGER;

-- PIN5 Abuse Check
ALTER TABLE "RateLimitEvent" ADD COLUMN "decision_abusive" BOOLEAN;
ALTER TABLE "RateLimitEvent" ADD COLUMN "decision_abuse_score" REAL;
ALTER TABLE "RateLimitEvent" ADD COLUMN "decision_confidence" REAL;

-- PIN6 Audit receipts (86 rows already live in ~/.local/state/hostamar/decision-receipts.jsonl)
CREATE TABLE IF NOT EXISTS "DecisionReceipt" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "question" TEXT NOT NULL,
  "choices" TEXT,
  "chosen" TEXT,
  "confidence" REAL,
  "judge1" TEXT,
  "judge2" TEXT,
  "agree" BOOLEAN,
  "whoProposed" TEXT,
  "modelUsed" TEXT,
  "backend" TEXT,
  "escalate" BOOLEAN,
  "judge1Ms" INTEGER,
  "probabilities" TEXT,
  "pin" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "DecisionReceipt_createdAt_idx" ON "DecisionReceipt"("createdAt");
CREATE INDEX IF NOT EXISTS "DecisionReceipt_pin_idx" ON "DecisionReceipt"("pin");
