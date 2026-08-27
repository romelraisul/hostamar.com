-- Run this SQL on Neon (https://neon.tech) to create the TV monetization tables
-- Generated from Prisma schema for Hostamar TV

-- Create TvIptvChannel table (1200 free-to-air channels)
CREATE TABLE "TvIptvChannel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "logo" TEXT,
    "category" TEXT NOT NULL DEFAULT 'General',
    "country" TEXT NOT NULL DEFAULT 'bd',
    "tvgId" TEXT,
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TvIptvChannel_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TvIptvChannel_category_country_idx" ON "TvIptvChannel"("category", "country");

-- Create TvView table (view tracking for monetization)
CREATE TABLE "TvView" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "referer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TvView_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TvView_channelId_createdAt_idx" ON "TvView"("channelId", "createdAt");

-- Fix ApiRequestLog NULL constraint (for db push compatibility)
ALTER TABLE "ApiRequestLog" ALTER COLUMN "apiKeyId" DROP NOT NULL;
ALTER TABLE "ApiRequestLog" ALTER COLUMN "apiKeyId" DROP DEFAULT;
