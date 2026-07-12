-- CreateTable
CREATE TABLE "ProvisioningLedger" (
    "id" TEXT NOT NULL,
    "tranId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "customerEmail" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "gateway" TEXT NOT NULL DEFAULT 'mock',
    "rawPayload" JSONB,
    "accountId" TEXT,
    "loginUrl" TEXT,
    "provisionedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProvisioningLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProvisioningLedger_tranId_key" ON "ProvisioningLedger"("tranId");
CREATE INDEX "ProvisioningLedger_status_idx" ON "ProvisioningLedger"("status");
CREATE INDEX "ProvisioningLedger_customerEmail_idx" ON "ProvisioningLedger"("customerEmail");
