#!/usr/bin/env node
// scripts/pgdump-to-turso.js — V38: Neon → Turso full data copy.
//
// Path 1 (preferred): import a pg_dump plain-SQL dump:
//   pg_dump -d "$NEON_UNPOOLED" --schema=public --data-only --inserts -f /tmp/neon_data.sql
//   DATABASE_URL="$(cat /tmp/turso_url.txt)" node scripts/pgdump-to-turso.js
// Path 2 (fallback, no dump file): direct copy over a live Postgres:
//   NEON_URL="$(cat /tmp/neon_unpooled.txt)" DATABASE_URL="$(cat /tmp/turso_url.txt)" node scripts/pgdump-to-turso.js
//
// Idempotent: INSERT OR REPLACE. Forces admin role at the end.
// ponytail: line comments are stripped outside strings; a data value containing a
// newline followed by '--' would survive (scanner tracks string state).

const fs = require('fs');
const { createClient } = require('@libsql/client');

function tursoFromEnv() {
  const full = process.env.DATABASE_URL;
  if (!full) throw new Error('DATABASE_URL (libsql://... or file:...) required');
  const base = full.split('?')[0];
  const token = new URL(full).searchParams.get('authToken') || '';
  const opts = { url: base };
  if (token) opts.authToken = token;
  return createClient(opts);
}

// Split SQL into statements on ';' outside single-quoted strings ('' = escaped).
// Skip '--' line comments when outside strings (pg_dump emits them with ';' inside).
function extractInserts(sql) {
  const stmts = [];
  let cur = '', inStr = false, i = 0;
  const n = sql.length;
  while (i < n) {
    if (!inStr && sql[i] === '-' && sql[i + 1] === '-') {
      while (i < n && sql[i] !== '\n') i++;
      continue;
    }
    const ch = sql[i];
    cur += ch;
    if (ch === "'") {
      if (inStr && sql[i + 1] === "'") { cur += "'"; i++; }
      else inStr = !inStr;
    } else if (ch === ';' && !inStr) {
      const s = cur.trim();
      if (s) stmts.push(s);
      cur = '';
    }
    i++;
  }
  if (cur.trim()) stmts.push(cur.trim());
  return stmts.filter(s => /^INSERT INTO /i.test(s));
}

function pgToSqlite(s) {
  return s
    .replace(/^INSERT INTO public\./i, 'INSERT OR REPLACE INTO ')
    .replace(/^INSERT INTO /i, 'INSERT OR REPLACE INTO ')
    .replace(/::[a-zA-Z_]+(\(\d+(,\d+)\))?/g, '') // pg type casts
    .replace(/\bE'/g, "'");                        // pg escape-string prefix
}

async function importDump(turso, dumpPath) {
  const inserts = extractInserts(fs.readFileSync(dumpPath, 'utf8')).map(pgToSqlite);
  console.log(`dump: ${inserts.length} INSERT statements`);
  let ok = 0, fail = 0;
  for (let i = 0; i < inserts.length; i++) {
    try { await turso.execute(inserts[i]); ok++; }
    catch (e) {
      fail++;
      if (fail <= 5) console.error('FAIL:', String(e.message).slice(0, 120), '|', inserts[i].slice(0, 80));
    }
    if (i > 0 && i % 200 === 0) console.log(`  ...${i}/${inserts.length}`);
  }
  console.log(`import: ${ok} ok, ${fail} fail`);
}

async function directPgCopy(turso, pgUrl) {
  const { Client } = require('pg');
  const pg = new Client({ connectionString: pgUrl.trim(), ssl: { rejectUnauthorized: false } });
  await pg.connect();
  console.log('pg: connected');
  const tables = (await pg.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`
  )).rows.map(r => r.table_name);
  for (const t of tables) {
    const n = parseInt((await pg.query(`SELECT COUNT(*) c FROM "${t}"`)).rows[0].c);
    if (!n) { console.log(`skip ${t} (0 rows)`); continue; }
    const { rows } = await pg.query(`SELECT * FROM "${t}"`);
    let ok = 0, fail = 0;
    for (const row of rows) {
      const cols = Object.keys(row);
      const vals = cols.map(c => {
        const v = row[c];
        if (v !== null && typeof v === 'object' && !(v instanceof Date)) return JSON.stringify(v);
        return v;
      });
      try {
        await turso.execute({
          sql: `INSERT OR REPLACE INTO "${t}" (${cols.map(c => `"${c}"`).join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
          args: vals,
        });
        ok++;
      } catch { fail++; }
    }
    console.log(`${t}: ${ok} ok, ${fail} fail`);
  }
  await pg.end();
}

async function main() {
  const turso = tursoFromEnv();
  const dumpPath = process.env.DUMP || '/tmp/neon_data.sql';
  if (fs.existsSync(dumpPath) && fs.statSync(dumpPath).size > 0) {
    await importDump(turso, dumpPath);
  } else if (process.env.NEON_URL) {
    await directPgCopy(turso, process.env.NEON_URL);
  } else {
    console.error('Nothing to do: no dump file and no NEON_URL.');
    console.error('Recovery: pg_dump -d "$NEON_UNPOOLED" --schema=public --data-only --inserts -f /tmp/neon_data.sql');
    process.exit(1);
  }
  await turso.execute(`UPDATE Customer SET role='admin' WHERE email='romelraisul@gmail.com'`);
  const users = await turso.execute('SELECT COUNT(*) n FROM Customer');
  const admins = await turso.execute(`SELECT email FROM Customer WHERE role IN ('admin','superadmin')`);
  console.log(`Customer rows: ${users.rows[0].n}; admins: ${admins.rows.map(r => r.email).join(', ') || '(none)'}`);
}

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });

module.exports = { extractInserts, pgToSqlite }; // for the self-check
