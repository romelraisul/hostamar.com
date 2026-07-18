-- CreateTable
CREATE TABLE "VoiceCall" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "transcript" JSONB NOT NULL,
    "summary" TEXT,
    "actionItems" JSONB,
    "reportJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceCall_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VoiceCall_createdAt_idx" ON "VoiceCall"("createdAt");

