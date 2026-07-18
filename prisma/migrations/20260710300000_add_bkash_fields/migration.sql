-- Migration: add_bkash_fields
-- Idempotent ALTER: link bKash tokenized-checkout to Payment.
-- reuses existing `transactionId` (bKash trxID) and adds providerPaymentId +
-- invoiceNumber. No phantom tables — Payment is a real model.
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "providerPaymentId" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "invoiceNumber" TEXT;

-- Mirror the @unique constraints from prisma/schema.prisma (idempotent).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Payment_providerPaymentId_key'
  ) THEN
    ALTER TABLE "Payment" ADD CONSTRAINT "Payment_providerPaymentId_key" UNIQUE ("providerPaymentId");
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Payment_invoiceNumber_key'
  ) THEN
    ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceNumber_key" UNIQUE ("invoiceNumber");
  END IF;
END $$;
