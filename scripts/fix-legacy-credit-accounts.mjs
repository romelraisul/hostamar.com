#!/usr/bin/env node
/**
 * Migration: backfill CreditAccount + welcome CreditTransaction for legacy
 * customers (the 25/78 that signed up before CreditAccount was added).
 * Idempotent — safe to run multiple times.
 *
 * Usage: node scripts/fix-legacy-credit-accounts.mjs
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('[migration] finding customers without CreditAccount...')

  // Find customers missing a CreditAccount
  const legacy = await prisma.$queryRaw`
    SELECT c.id, c.email, c.credits, c."createdAt"
    FROM "Customer" c
    LEFT JOIN "CreditAccount" ca ON ca."customerId" = c.id
    WHERE ca.id IS NULL
    ORDER BY c."createdAt" ASC`

  console.log(`[migration] ${legacy.length} legacy customers need CreditAccount`)

  let created = 0
  let skipped = 0

  for (const row of legacy) {
    try {
      const balance = Number(row.credits || 0)
      // Skip customers with negative or zero balance (don't create empty accounts)
      if (balance <= 0) {
        skipped++
        continue
      }
      // Create CreditAccount
      const acctRes = await prisma.$executeRaw`
        INSERT INTO "CreditAccount" (id, "customerId", credits)
        VALUES (gen_random_uuid()::text, ${row.id}, ${balance})`
      if (Number(acctRes) === 0) { skipped++; continue }

      // Fetch the new account's id
      const acctRows = await prisma.$queryRaw`
        SELECT id FROM "CreditAccount" WHERE "customerId" = ${row.id} LIMIT 1`
      const accountId = acctRows[0]?.id
      if (!accountId) { skipped++; continue }

      // Check if a welcome_bonus CreditTransaction already exists
      const existing = await prisma.$queryRaw`
        SELECT id FROM "CreditTransaction"
        WHERE "accountId" = ${accountId} AND product = 'welcome_bonus'
        LIMIT 1`
      if (Array.isArray(existing) && existing[0]) {
        // Audit row already present — just update balance to match if off
        await prisma.$executeRaw`
          UPDATE "CreditTransaction" SET "balanceAfter" = ${balance}
          WHERE id = ${existing[0].id}`
        created++
        continue
      }

      // Backfill the welcome audit row
      await prisma.$executeRaw`
        INSERT INTO "CreditTransaction" (id, "accountId", amount, product, "balanceAfter", description)
        VALUES (gen_random_uuid()::text, ${accountId}, ${balance}, 'welcome_bonus', ${balance}, 'Backfilled welcome credits — legacy account')`.catch(() => null)
      created++
    } catch (err) {
      console.error(`[migration] failed for ${row.email}:`, err?.message || err)
      skipped++
    }
  }

  console.log(`[migration] done — created: ${created}, skipped: ${skipped}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('[migration] fatal:', e)
    prisma.$disconnect()
    process.exit(1)
  })
