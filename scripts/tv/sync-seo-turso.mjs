// sync-seo-turso.mjs — copy TvVideoSeo rows that exist in local postgres but
// are missing from Turso (production DB the deployed site reads).
//
// Why: seo_generate.py / seo_ensure_shelf.py write LOCAL postgres (localhost:5432),
// but hostamar.com reads Turso — new /tv/watch/{slug} pages 404 on the edge until
// this sync runs. Run after any SEO insert (called automatically by
// seo_ensure_shelf.py). INSERT OR IGNORE — never overwrites production rows.
import fs from 'fs';
import { execSync } from 'child_process';
import { createClient } from '@libsql/client';

// manual .env parse (dotenv not resolvable outside the repo's node_modules)
for (const line of fs.readFileSync('/home/romel/hostamar.com/.env.local', 'utf8').split('\n')) {
  const m = line.match(/^DATABASE_URL="?([^"\n]+)"?/);
  if (m) process.env.DATABASE_URL = m[1];
}
const url = process.env.DATABASE_URL.split('?')[0];
const authToken = process.env.DATABASE_URL.split('authToken=')[1];

const env = { ...process.env, PGPASSWORD: 'hostamar' };
const psql = (sql) => execSync(
  `psql -h localhost -U hostamar -d hostamar -t -A -F '\x1f' -c ${JSON.stringify(sql)}`,
  { env, shell: '/bin/bash' }).toString();

const cols = ['id','videoSourceId','slug','titleBn','metaDescription','keywords',
  'transcriptBn','schemaString','ogImage','canonicalUrl','product','viralScore',
  'views','createdAt','updatedAt'];

(async () => {
  const c = createClient({ url, authToken });
  const tursoSlugs = new Set(
    (await c.execute('SELECT slug FROM "TvVideoSeo"')).rows.map(r => r.slug));
  const pgSlugs = psql('SELECT slug FROM "TvVideoSeo"').split('\n').filter(Boolean);
  const missing = pgSlugs.filter(s => !tursoSlugs.has(s));
  if (!missing.length) { console.log('sync: turso up to date'); return; }

  const lit = missing.map(s => `'${s.replace(/'/g, "''")}'`).join(',');
  const rows = psql(
    `SELECT ${cols.map(x => `"${x}"`).join(',')} FROM "TvVideoSeo" WHERE slug IN (${lit})`
  ).split('\n').filter(Boolean).map(l => l.split('\x1f'));

  for (const f of rows) {
    const r = Object.fromEntries(cols.map((k, i) => [k, f[i] || null]));
    const ts = v => v ? v.slice(0, 19) : null;  // turso timestamps are text
    r.viralScore = r.viralScore ? parseFloat(r.viralScore) : 0;
    r.views = r.views ? parseInt(r.views) : 0;
    r.createdAt = ts(r.createdAt); r.updatedAt = ts(r.updatedAt);
    await c.execute({
      sql: `INSERT OR IGNORE INTO "TvVideoSeo" (${cols.map(x=>`"${x}"`).join(',')}) ` +
           `VALUES (${cols.map(()=>'?').join(',')})`,
      args: cols.map(k => r[k]),
    });
  }
  const n = (await c.execute('SELECT count(*) as n FROM "TvVideoSeo"')).rows[0].n;
  console.log(`sync: pushed ${rows.length} rows to turso, total ${n}`);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
