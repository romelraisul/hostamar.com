// Restore TvPlaylistItem rows from playlist.host.txt (98 own-render shelf files)
import { createClient } from '@libsql/client';
import fs from 'node:fs';
const c = createClient({ url: process.env.DB_URL, authToken: process.env.DB_TOK });
const lines = fs.readFileSync('/home/romel/hostamar-build/docker/tv-station/videos/playlist.host.txt','utf8')
  .split('\n').map(l => l.trim()).filter(Boolean);
const files = [...new Set(lines.map(l => (l.match(/file '(.+?)'/)||[])[1]).filter(Boolean))];
const ok = files.filter(f => fs.existsSync(f) && fs.statSync(f).size > 0);
console.log(`lines=${lines.length} unique=${files.length} on-disk=${ok.length}`);
const ch = (await c.execute(`SELECT id FROM TvChannel LIMIT 1`)).rows[0];
if (!ch) { console.log('NO CHANNEL'); process.exit(1); }
let pos = 0;
for (const f of ok) {
  const stem = f.split('/').pop().replace(/\.mp4$/,'');
  const url = `https://hostamar.com/tv/${stem}.mp4`;
  pos++;
  await c.execute({ sql: `INSERT INTO TvPlaylistItem (id, channelId, title, url, source, position, played, createdAt) VALUES (?, ?, ?, ?, 'shelf', ?, 0, ?)`,
    args: [`tvrest${Date.now()}${pos}`, ch.id, stem, url, pos, new Date().toISOString()] });
}
await c.execute(`UPDATE TvChannel SET isLive=1 WHERE id='${ch.id}'`);
const n = (await c.execute(`SELECT COUNT(*) n FROM TvPlaylistItem WHERE channelId='${ch.id}' AND played=0`)).rows[0].n;
console.log('inserted, unplayed count now =', n);
