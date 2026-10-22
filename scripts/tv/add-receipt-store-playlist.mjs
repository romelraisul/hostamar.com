import fs from 'fs';
import { createClient } from '@libsql/client';

// manual .env parse (same as sync-seo-turso.mjs)
for (const line of fs.readFileSync('/home/romel/hostamar.com/.env.local', 'utf8').split('\n')) {
  const m = line.match(/^DATABASE_URL="?([^"\n]+)"?/);
  if (m) process.env.DATABASE_URL = m[1];
}
const url = process.env.DATABASE_URL.split('?')[0];
const authToken = process.env.DATABASE_URL.split('authToken=')[1];
const db = createClient({ url, authToken });

const ch = await db.execute('SELECT id FROM "TvChannel" ORDER BY "createdAt" ASC LIMIT 1');
console.log('channel:', ch.rows[0]?.id);
const maxPos = await db.execute('SELECT MAX(position) as m FROM "TvPlaylistItem" WHERE "channelId" = ?', [ch.rows[0]?.id]);
console.log('max pos:', maxPos.rows[0]?.m);
const id = ch.rows[0]?.id;
if (id) {
  await db.execute({
    sql: 'INSERT INTO "TvPlaylistItem" (id, "channelId", title, url, source, position, "videoId", "createdAt") VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
    args: [crypto.randomUUID(), id, 'receipt-store-narrated', 'https://hostamar.com/tv/receipt-store-narrated.mp4', 'shelf', (Number(maxPos.rows[0]?.m || 0) + 1), 'edge::receipt-store-narrated.mp4']
  });
  console.log('inserted');
}