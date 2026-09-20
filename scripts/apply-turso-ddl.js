// Apply prisma-generated SQLite DDL to Turso via libsql (prisma CLI can't speak libsql).
const { createClient } = require('@libsql/client');

async function main() {
  const url = process.env.DATABASE_URL.split('?')[0];
  const authToken = process.env.DATABASE_URL.split('authToken=')[1];
  const c = createClient({ url, authToken });
  const fs = require('fs');
  const ddl = fs.readFileSync('/tmp/turso-ddl.sql', 'utf8');
  // Split on statement boundaries (; at end of line) — keep CREATE INDEX whole.
  const stmts = ddl.split(';').map(s => s.replace(/--[^\n]*\n/g, '').trim()).filter(s => s.length > 5);
  let applied = 0, skipped = 0;
  for (const s of stmts) {
    try {
      await c.execute(s);
      applied++;
    } catch (e) {
      if (String(e.message).includes('already exists')) { skipped++; }
      else { console.error('FAIL:', e.message.slice(0, 120), '| stmt:', s.slice(0, 60)); }
    }
  }
  const tables = await c.execute("SELECT name FROM sqlite_master WHERE type='table'");
  console.log(`applied=${applied} skipped=${skipped} tables=${tables.rows.length}`);
  console.log('auth tables:', tables.rows.map(r => r.name).filter(n => ['User','Account','Session','VerificationToken'].includes(n)).join(', '));
}
main().catch(e => { console.error(e); process.exit(1); });
