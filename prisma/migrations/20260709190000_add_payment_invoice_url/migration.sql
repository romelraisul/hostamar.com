-- Add invoiceUrl column to Payment (additive, non-destructive)
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "invoiceUrl" TEXT;
