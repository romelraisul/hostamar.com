-- Correct DecisionReceipt to mirror what jev-server.py actually writes (18 keys), and backfill
-- the JSONL audit trail into it. The first migration guessed columns from the brief; the writer
-- is the truth. Table was empty (0 rows) so a rebuild loses nothing.
DROP TABLE IF EXISTS "DecisionReceipt";
CREATE TABLE "DecisionReceipt" (
  "id"             TEXT PRIMARY KEY NOT NULL,  -- written as int(t0*1000) ms; lexicographic == numeric
  "ts"             TEXT,                       -- as written by jev-server: 2026-10-09T04:22:11+0600
  "question"       TEXT,
  "choices"        TEXT,                       -- JSON array
  "chosen"         TEXT,
  "confidence"     REAL,
  "reasoning"      TEXT,
  "probabilities"  TEXT,                       -- JSON object
  "who_proposed"   TEXT,
  "model"          TEXT,
  "backend"        TEXT,
  "judge2"         TEXT,                       -- JSON object
  "agree"          INTEGER,                    -- null = second judge never ran
  "escalate"       INTEGER,
  "routed_to"      TEXT,
  "judge1_ms"      INTEGER,
  "latency_ms"     INTEGER,
  "human_override" TEXT
);
CREATE INDEX IF NOT EXISTS "DecisionReceipt_id_desc_idx" ON "DecisionReceipt"("id" DESC);
CREATE INDEX IF NOT EXISTS "DecisionReceipt_chosen_idx"  ON "DecisionReceipt"("chosen");
