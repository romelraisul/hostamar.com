-- SQL migration, add missing preview/subtitle models and verify render columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'preview') THEN
    CREATE TYPE preview_status AS ENUM ('pending', 'processing', 'done', 'failed');
    CREATE TYPE render_status AS ENUM (
      'queued',
      'processing',
      'rendering',
      'uploading',
      'done',
      'failed',
      'cancelled'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Preview" (
  id TEXT PRIMARY KEY,
  "customerId" TEXT NOT NULL REFERENCES "Customer"(id) ON DELETE CASCADE,
  "campaignId" TEXT,
  topic TEXT,
  script TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  "errorMessage" TEXT,
  "thumbnailUrl" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Subtitle" (
  id TEXT PRIMARY KEY,
  "previewId" TEXT NOT NULL REFERENCES "Preview"(id) ON DELETE CASCADE,
  "videoId" TEXT,
  text TEXT,
  start FLOAT NOT NULL DEFAULT 0,
  "end" FLOAT NOT NULL DEFAULT 0
);