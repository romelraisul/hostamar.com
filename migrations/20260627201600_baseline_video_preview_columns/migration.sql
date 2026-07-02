-- Safe re-runnable baseline migration for hostamar-build schema drift.
-- Adds the columns the API/worker expect only if they are missing,
-- then backfills defaults where appropriate.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Customer'
      AND column_name = 'credits'
  ) THEN
    ALTER TABLE "Customer" ADD COLUMN credits INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'VideoQueue'
      AND column_name = 'type'
  ) THEN
    ALTER TABLE "VideoQueue" ADD COLUMN type TEXT NOT NULL DEFAULT 'video';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'VideoQueue'
      AND column_name = 'renderStatus'
  ) THEN
    ALTER TABLE "VideoQueue" ADD COLUMN "renderStatus" TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'VideoQueue'
      AND column_name = 'renderError'
  ) THEN
    ALTER TABLE "VideoQueue" ADD COLUMN "renderError" TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'VideoQueue'
      AND column_name = 'videoUrl'
  ) THEN
    ALTER TABLE "VideoQueue" ADD COLUMN "videoUrl" TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'VideoQueue'
      AND column_name = 'thumbnailUrl'
  ) THEN
    ALTER TABLE "VideoQueue" ADD COLUMN "thumbnailUrl" TEXT;
  END IF;
END $$;

-- Backfill queue render fields to `queued` where status suggests work is pending.
UPDATE "VideoQueue"
SET "renderStatus" = COALESCE("renderStatus", 'queued')
WHERE status IN ('pending', 'queued');

-- Backfill credits as 0 for any nulls once column exists.
UPDATE "Customer"
SET credits = COALESCE(credits, 0)
WHERE credits IS NULL;
