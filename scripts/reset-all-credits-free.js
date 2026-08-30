#!/usr/bin/env node
/**
 * Reset all drained customers (credits <= 0) back to 6000 FREE UNLIMITED.
 * V11 full-free mode: balances stay 6000, nothing 402s, but old drained
 * accounts need their balance restored so the dashboard shows 6000/6000.
 *
 * Usage: DATABASE_URL=... node scripts/reset-all-credits-free.js
 * (Reads DATABASE_URL from env — run from repo root; raw SQL, no schema change.)
 */
const { Client } = require('pg')

async function main() {
  const url = process.env.DATABASE_URL
  if (!url || !url.startsWith('postgresql://')) {
    console.error('DATABASE_URL required (postgresql://…)')
    process.exit(1)
  }
  const c = new Client({ connectionString: url })
  await c.connect()
  const r = await c.query(`UPDATE "Customer" SET credits = 6000 WHERE credits <= 0`)
  console.log(`reset ${r.rowCount} drained customers to 6000 (FREE UNLIMITED mode)`)
  await c.end()
}

main().catch(e => { console.error(e.message); process.exit(1) })
