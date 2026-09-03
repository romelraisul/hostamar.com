-- V34 Hostamar Drive — additive-only DDL for the two NEW tables.
-- Matches prisma/schema.prisma models DriveFolder + DriveFile exactly.
-- NOT using `prisma db push` here: the repo schema has unrelated drift
-- (Conversation.userId NULLs, CreditTransaction required cols) vs the prod
-- DB from other sessions, and push wants destructive steps for those —
-- this file adds ONLY the new tables. Full push happens in a drift session.
CREATE TABLE IF NOT EXISTS "DriveFolder" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DriveFolder_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "DriveFile" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "folderId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileHash" TEXT,
    "telegramChannelId" TEXT NOT NULL,
    "telegramMessageId" INTEGER NOT NULL,
    "telegramFileId" TEXT,
    "chunkCount" INTEGER NOT NULL DEFAULT 1,
    "chunkGroupId" TEXT,
    "shareToken" TEXT,
    "shareTokenExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DriveFile_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "DriveFolder" ADD CONSTRAINT "DriveFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "DriveFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DriveFile" ADD CONSTRAINT "DriveFile_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "DriveFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "DriveFolder_ownerId_parentId_idx" ON "DriveFolder"("ownerId", "parentId");
CREATE INDEX IF NOT EXISTS "DriveFile_ownerId_folderId_idx" ON "DriveFile"("ownerId", "folderId");
CREATE INDEX IF NOT EXISTS "DriveFile_fileHash_idx" ON "DriveFile"("fileHash");
CREATE INDEX IF NOT EXISTS "DriveFile_chunkGroupId_idx" ON "DriveFile"("chunkGroupId");
