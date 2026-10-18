// Turso (live primary) -> Supabase (postgres backup) row sync.
// Runs in GitHub Actions (db-mirror.yml). WSL cannot run it: this network
// blocks outbound 5432 and Supabase's direct host is IPv6-only.
// ponytail: full drop/recreate/insert each run — Turso is the source of truth
// so the mirror can never drift; switch to incremental updatedAt sync if any
// table grows past ~100k rows.
import { createClient } from '@libsql/client/web'
import { getSupabase } from '../lib/db-postgres'

const TABLES = [
  'Customer', 'Business', 'CreditTransaction', 'Subscription',
  'Video', 'VideoQueue', 'Payment', 'Transaction', 'Order',
]

const TYPEMAP: Record<string, string> = {
  TEXT: 'text', INTEGER: 'bigint', REAL: 'double precision',
  DATETIME: 'timestamptz', BOOLEAN: 'boolean', JSON: 'jsonb', BLOB: 'bytea',
}
const pgType = (t: unknown) => TYPEMAP[String(t || '').toUpperCase().split('(')[0].trim()] || 'text'

const toPg = (v: unknown, declType: string) => {
  if (typeof v === 'bigint') return v.toString()
  if (declType === 'BOOLEAN') return v === 1 || v === true || v === 'true'
  if (v instanceof ArrayBuffer) return Buffer.from(v)
  return v as never
}

async function main() {
  if (!process.env.SUPABASE_URL) {
    console.log('sync-db: SUPABASE_URL not set — skipping (Turso primary untouched)')
    return
  }
  const raw = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL?.split('?')[0]
  const authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_URL?.split('authToken=')[1]?.split('&')[0]
  if (!raw) throw new Error('TURSO_DATABASE_URL / DATABASE_URL not configured')
  const turso = createClient({ url: raw.replace(/^libsql:\/\//, 'https://'), authToken })
  const pg = getSupabase()!

  for (const table of TABLES) {
    const info = await turso.execute(`PRAGMA table_info("${table}")`)
    if (!info.rows.length) { console.log(`${table}: absent in Turso — skipped`); continue }

    const cols = info.rows.map(r => ({
      name: String(r.name),
      type: String(r.type || 'TEXT'),
    }))
    const hasId = cols.some(c => c.name === 'id')
    if (!hasId) { console.log(`${table}: no id column — skipped`); continue }

    const ddl = cols.map(c => `"${c.name}" ${c.name === 'id' ? 'text PRIMARY KEY' : pgType(c.type)}`).join(', ')
    await pg.query(`DROP TABLE IF EXISTS "${table}"`)
    await pg.query(`CREATE TABLE "${table}" (${ddl})`)

    const rows = await turso.execute(`SELECT * FROM "${table}"`)
    const colList = cols.map(c => `"${c.name}"`).join(',')
    const ph = cols.map((_, i) => `$${i + 1}`).join(',')
    const sql = `INSERT INTO "${table}" (${colList}) VALUES (${ph})`
    for (const row of rows.rows) {
      const args = cols.map(c => toPg(row[c.name], c.type.toUpperCase()))
      await pg.query(sql, args)
    }
    console.log(`${table}: ${rows.rows.length} rows synced`)
  }

  if (process.argv.includes('--check')) {
    for (const table of TABLES) {
      try {
        const n = await pg.query(`SELECT count(*)::int AS n FROM "${table}"`)
        console.log(`check ${table}: supabase=${n.rows[0].n}`)
      } catch { /* table absent in Turso */ }
    }
  }
  console.log('SYNC DONE')
}

main().catch(e => { console.error('SYNC FAILED:', e); process.exit(1) }).finally(() => process.exit())
