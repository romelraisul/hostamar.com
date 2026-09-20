#!/usr/bin/env node
// scripts/dump-turso.js — V40: full Turso dump (schema + data) as SQLite SQL.
// Usage: DATABASE_URL=<libsql url> node scripts/dump-turso.js /path/out.sql
// Restore: sqlite3 new.db < out.sql  (or libsql file: client, see docs/v40 restore test)
const fs = require('fs');
const { createClient } = require('@libsql/client');

async function main() {
  const outPath = process.argv[2];
  if (!outPath) { console.error('usage: node dump-turso.js <out.sql>'); process.exit(1); }
  const full = process.env.DATABASE_URL;
  const c = createClient({ url: full.split('?')[0], authToken: new URL(full).searchParams.get('authToken') || '' });

  const notSys = "name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND sql IS NOT NULL";
  const schema = (await c.execute(`SELECT sql FROM sqlite_master WHERE type='table' AND ${notSys}`)).rows.map(r => r.sql + ';');
  const tables = (await c.execute(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'`)).rows.map(r => r.name);

  const out = [...schema, 'BEGIN TRANSACTION;'];
  for (const t of tables) {
    const rows = await c.execute(`SELECT * FROM "${t}"`);
    const cols = rows.columns;
    for (const r of rows.rows) {
      const vals = cols.map(col => {
        const v = r[col];
        if (v === null) return 'NULL';
        if (typeof v === 'number' || typeof v === 'bigint') return String(v);
        if (v instanceof Uint8Array) return 'X\'' + Buffer.from(v).toString('hex') + '\'';
        return "'" + String(v).replace(/'/g, "''") + "'";
      });
      out.push(`INSERT INTO "${t}" (${cols.map(x => `"${x}"`).join(',')}) VALUES (${vals.join(',')});`);
    }
  }
  out.push('COMMIT;');
  fs.writeFileSync(outPath, out.join('\n'));
  console.log(`dump: ${tables.length} tables, ${(fs.statSync(outPath).size / 1024).toFixed(0)}KB -> ${outPath}`);
}
main().catch(e => { console.error(e.message); process.exit(1); });
