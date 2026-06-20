-- ---------------------------------------------------------------------------
-- Migration: Make videoUrl and thumbnailUrl NOT NULL
-- 
-- Run this AFTER verifying all rows have values populated.
-- Safe to run in a maintenance window; rolls back quickly.
--
-- Precondition check:
--   SELECT COUNT(*) FROM "Video" WHERE "videoUrl" IS NULL OR "thumbnailUrl" IS NULL;
--   -- Must return 0 before running this migration.
--
-- Rollback:
--   ALTER TABLE "Video"
--     ALTER COLUMN "videoUrl" DROP NOT NULL,
--     ALTER COLUMN "thumbnailUrl" DROP NOT NULL;
-- ---------------------------------------------------------------------------

BEGIN;

ALTER TABLE "Video"
  ALTER COLUMN "videoUrl" SET NOT NULL,
  ALTER COLUMN "thumbnailUrl" SET NOT NULL;

COMMIT;
