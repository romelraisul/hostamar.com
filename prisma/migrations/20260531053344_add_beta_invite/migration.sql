-- CreateEnum
CREATE TYPE "BetaStatus" AS ENUM ('PENDING', 'ACTIVE', 'USED', 'EXPIRED');

-- CreateTable
CREATE TABLE "BetaInvite" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "status" "BetaStatus" NOT NULL DEFAULT 'PENDING',
    "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BetaInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BetaInvite_code_key" ON "BetaInvite"("code");

-- CreateIndex
CREATE INDEX "BetaInvite_status_idx" ON "BetaInvite"("status");

-- CreateIndex
CREATE INDEX "BetaInvite_createdAt_idx" ON "BetaInvite"("createdAt");
