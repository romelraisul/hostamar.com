-- ---------------------------------------------------------------------------
-- Migration: Add progress column to Video table
--
-- Used by BullMQ worker to report incremental progress (0–100) during
-- video generation. Frontend polls this value for real-time progress bar.
--
-- Safe to run anytime (nullable, default 0).
-- ---------------------------------------------------------------------------

BEGIN;

ALTER TABLE "Video"
  ADD COLUMN IF NOT EXISTS "progress" INTEGER DEFAULT 0;

COMMIT;
