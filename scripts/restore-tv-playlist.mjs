// Restore TvPlaylistItem rows from playlist.host.txt (98 own-render shelf files)
// Idempotent (QUILL 2026-10-04): skips stems already unplayed in the shelf DB,
// dedupes the file list, ONLY_STEMS=a,b,c filters to specific renders, and
// positions continue from MAX(position) so inserts land after existing rows.
import { createClient } from '@libsql/client';
import fs from 'node:fs';
if (!process.env.DB_URL || !process.env.DB_TOK) {
  const line = fs.readFileSync('/home/romel/hostamar.com/.env.production','utf8')
    .split('\n').find(l => l.startsWith('DATABASE_URL=')) || '';
  const m = line.match(/^DATABASE_URL="?libsql:\/\/([^?"']+)\?authToken=([^?"']+)"?$/);
  if (!m) { console.log('NO_CREDS'); process.exit(1); }
  process.env.DB_URL = `libsql://${m[1]}`;
  process.env.DB_TOK = m[2];
}
const c = createClient({ url: process.env.DB_URL, authToken: process.env.DB_TOK });
const lines = fs.readFileSync('/home/romel/hostamar-build/docker/tv-station/videos/playlist.host.txt','utf8')
  .split('\n').map(l => l.trim()).filter(Boolean);
const files = [...new Set(lines.map(l => (l.match(/file '(.+?)'/)||[])[1]).filter(Boolean))];
const only = (process.env.ONLY_STEMS||'').split(',').map(s=>s.trim()).filter(Boolean);
const wanted = only.length ? files.filter(f => only.includes(f.split('/').pop().replace(/\.mp4$/,''))) : files;
const ok = wanted.filter(f => fs.existsSync(f) && fs.statSync(f).size > 0);
console.log(`lines=${lines.length} unique=${files.length} wanted=${wanted.length} on-disk=${ok.length}`);
const ch = (await c.execute(`SELECT id FROM TvChannel LIMIT 1`)).rows[0];
if (!ch) { console.log('NO CHANNEL'); process.exit(1); }
const existing = new Set((await c.execute(
  `SELECT title FROM TvPlaylistItem WHERE channelId='${ch.id}' AND played=0`
)).rows.map(r => r.title));
let pos = Number((await c.execute(
  `SELECT COALESCE(MAX(position),0) p FROM TvPlaylistItem WHERE channelId='${ch.id}'`
)).rows[0].p);
let inserted = 0, skipped = 0;
for (const f of ok) {
  const stem = f.split('/').pop().replace(/\.mp4$/,'');
  if (existing.has(stem)) { skipped++; continue; }
  const url = `https://hostamar.com/tv/${stem}.mp4`;
  pos = pos + 1;
  await c.execute({ sql: `INSERT INTO TvPlaylistItem (id, channelId, title, url, source, position, played, createdAt) VALUES (?, ?, ?, ?, 'shelf', ?, 0, ?)`,
    args: [`tvrest${Date.now()}${pos}`, ch.id, stem, url, pos, new Date().toISOString()] });
  inserted++;
}
console.log(`inserted=${inserted} skipped=${skipped}`);
await c.execute(`UPDATE TvChannel SET isLive=1 WHERE id='${ch.id}'`);
const n = (await c.execute(`SELECT COUNT(*) n FROM TvPlaylistItem WHERE channelId='${ch.id}' AND played=0`)).rows[0].n;
console.log('unplayed count now =', n);
