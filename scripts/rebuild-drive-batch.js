// V39: rebuild DriveFile in Turso from state-v10.json — app-native format:
// chunked files = ONE ROW PER PART sharing chunkGroupId (upload route format),
// single files = one row. fileSize per part = actual part size (last part = remainder).
const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');
const CHUNK = Math.floor(1.9 * 1024 ** 3);
const CHANNEL = '-1004296347934';
const FOLDER_ID = 'fldr-drive-migrated-top30';

async function main() {
  const tursoFull = fs.readFileSync('/tmp/turso_url.txt', 'utf8').trim();
  const turso = createClient({ url: tursoFull.split('?')[0], authToken: new URL(tursoFull).searchParams.get('authToken') || '' });
  const state = JSON.parse(fs.readFileSync(path.join(process.env.HOME, 'hostamar-migrate/state-v10.json'), 'utf8'));
  const uploaded = state.uploaded || {}, downloaded = state.downloaded || {}, chunks = state.chunks || {};
  const ownerId = (await turso.execute('SELECT id FROM Customer LIMIT 1')).rows[0].id;
  await turso.execute({ sql: `INSERT OR REPLACE INTO DriveFolder (id, ownerId, name, parentId, createdAt, updatedAt) VALUES (?,?,?,NULL,datetime('now'),datetime('now'))`, args: [FOLDER_ID, ownerId, 'Drive-Top30-Migrated'] });

  const rows = [];
  for (const [fileName, meta] of Object.entries(uploaded)) {
    const msgs = meta.msgs || [];
    if (!msgs.length) continue;
    const dl = downloaded[fileName] || {};
    const total = dl.size || 0;
    const sha = meta.sha256 || dl.sha256 || '';
    const gid = 'mig-' + (meta.gid || fileName).replace(/[^a-zA-Z0-9_-]/g, '').slice(-40);
    const n = msgs.length;
    // msgs are in upload order (chunk 0..N-1); part sizes: full CHUNK except last = remainder
    for (let i = 0; i < n; i++) {
      const partSize = n === 1 ? total : (i < n - 1 ? CHUNK : Math.max(total - CHUNK * (n - 1), 0));
      rows.push([gid + (n > 1 ? '-p' + i : ''), ownerId, FOLDER_ID,
        n > 1 ? (i === 0 ? fileName : `${fileName}.part${i}`) : fileName,
        partSize, 'application/octet-stream', i === 0 ? sha : null,
        CHANNEL, msgs[i], String(msgs[i]), n, n > 1 ? gid : null, i]);
    }
  }
  console.log('part-rows to insert:', rows.length);
  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    const stmts = rows.slice(i, i + BATCH).map(r => ({
      sql: `INSERT OR REPLACE INTO DriveFile (id, ownerId, folderId, fileName, fileSize, mimeType, fileHash, telegramChannelId, telegramMessageId, telegramFileId, chunkCount, chunkGroupId, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,datetime('now', '+' || ? || ' seconds'),datetime('now'))`,
      args: r }));
    await turso.batch(stmts, 'write');
    if ((i / BATCH) % 8 === 0) console.log(`  ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }
  const cnt = await turso.execute('SELECT COUNT(*) n, SUM(fileSize) s FROM DriveFile');
  const heads = await turso.execute(`SELECT COUNT(*) n FROM DriveFile WHERE chunkGroupId IS NOT NULL AND fileName NOT LIKE '%.part%'`);
  console.log('DriveFile rows:', cnt.rows[0].n, '| total', (Number(cnt.rows[0].s) / 1e9).toFixed(1) + 'GB', '| chunked heads:', heads.rows[0].n);
}
main().catch(e => { console.error(e.message); process.exit(1); });
