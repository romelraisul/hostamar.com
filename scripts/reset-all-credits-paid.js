#!/usr/bin/env node
/**
 * V12 PAID MODE reset — bring every customer to the 6000cr bonus baseline:
 *   - drained (credits < 6000, incl. 0) → 6000 (fresh bonus)
 *   - inflated (> 6000 from old test recharges) → 6000 (clean baseline)
 * Idempotent; run with DATABASE_URL from .env.
 */
const { Client } = require('pg')

async function main() {
  const url = process.env.DATABASE_URL
  if (!url || !url.startsWith('postgresql://')) {
    console.error('DATABASE_URL required')
    process.exit(1)
  }
  const c = new Client({ connectionString: url })
  await c.connect()
  const r = await c.query(`UPDATE "Customer" SET credits = 6000 WHERE credits < 6000 OR credits > 6000`)
  console.log(`V12 baseline: ${r.rowCount} customers set to 6000cr (paid-mode bonus)`)
  await c.end()
}
main().catch(e => { console.error(e.message); process.exit(1) })
