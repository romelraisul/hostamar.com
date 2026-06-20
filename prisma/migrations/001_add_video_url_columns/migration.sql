-- ---------------------------------------------------------------------------
-- Migration: Add videoUrl and thumbnailUrl columns to the Video table
-- 
-- These columns are written by the worker callback at
-- /api/worker/video-update when a generation job completes.
-- 
-- Applied:   PR #1 deployment
-- Rollback:  ALTER TABLE "Video" DROP COLUMN "videoUrl", DROP COLUMN "thumbnailUrl";
-- ---------------------------------------------------------------------------

BEGIN;

ALTER TABLE "Video"
  ADD COLUMN IF NOT EXISTS "videoUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "thumbnailUrl" TEXT;

COMMIT;

-- ---------------------------------------------------------------------------
-- Post-backfill NOT NULL migration (run after verifying all rows have values)
-- ---------------------------------------------------------------------------
-- BEGIN;
-- UPDATE "Video" SET "videoUrl" = "url" WHERE "videoUrl" IS NULL AND "url" IS NOT NULL;
-- ALTER TABLE "Video"
--   ALTER COLUMN "videoUrl" SET NOT NULL,
--   ALTER COLUMN "thumbnailUrl" SET NOT NULL;
-- COMMIT;
