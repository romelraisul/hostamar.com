#!/usr/bin/env node
// scripts/rebuild-drive-from-telegram.js — V39: rebuild DriveFile/DriveFolder in Turso
// from ~/hostamar-migrate/state-v10.json (uploaded map). No Neon needed.
// Idempotent: INSERT OR REPLACE on cuid ids derived from gid.
// Run: node scripts/rebuild-drive-from-telegram.js   (DATABASE_URL via /tmp/turso_url.txt)

const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

const CHANNEL = '-1004296347934';
const FOLDER_NAME = 'Drive-Top30-Migrated';
const FOLDER_ID = 'fldr-drive-migrated-top30';

async function main() {
  const tursoFull = fs.readFileSync('/tmp/turso_url.txt', 'utf8').trim();
  const base = tursoFull.split('?')[0];
  const token = new URL(tursoFull).searchParams.get('authToken') || '';
  const turso = createClient({ url: base, authToken: token });

  const state = JSON.parse(fs.readFileSync(path.join(process.env.HOME, 'hostamar-migrate/state-v10.json'), 'utf8'));
  const uploaded = state.uploaded || {};
  const downloaded = state.downloaded || {};
  const customers = await turso.execute('SELECT id FROM Customer LIMIT 1');
  if (!customers.rows.length) throw new Error('No Customer rows — run admin login first');
  const ownerId = customers.rows[0].id;

  // one folder for all migrated files
  await turso.execute({
    sql: `INSERT OR REPLACE INTO DriveFolder (id, ownerId, name, parentId, createdAt, updatedAt) VALUES (?,?,?,NULL,datetime('now'),datetime('now'))`,
    args: [FOLDER_ID, ownerId, FOLDER_NAME],
  });

  let ok = 0, skip = 0, fail = 0;
  for (const [fileName, meta] of Object.entries(uploaded)) {
    const msgs = meta.msgs || [];
    if (!msgs.length) { skip++; continue; }
    const dl = downloaded[fileName] || {};
    const size = dl.size || 0;
    const sha = meta.sha256 || dl.sha256 || '';
    const chunkCount = msgs.length;
    // stable id from gid (state gid is truncated at 32 chars — still unique per file)
    const id = 'drv-' + (meta.gid || fileName).replace(/[^a-zA-Z0-9_-]/g, '').slice(-40);
    // chunked files: telegramMessageId = FIRST msg, chunkGroupId = gid
    const firstMsg = Math.min(...msgs);
    const chunkGroupId = chunkCount > 1 ? (meta.gid || id) : null;
    try {
      await turso.execute({
        sql: `INSERT OR REPLACE INTO DriveFile
              (id, ownerId, folderId, fileName, fileSize, mimeType, fileHash,
               telegramChannelId, telegramMessageId, telegramFileId,
               chunkCount, chunkGroupId, createdAt, updatedAt)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,NULL,datetime('now'),datetime('now'))`,
        args: [id, ownerId, FOLDER_ID, fileName, size, 'application/octet-stream', sha,
               CHANNEL, firstMsg, String(firstMsg), chunkCount, chunkGroupId],
      });
      ok++;
    } catch (e) {
      fail++;
      if (fail <= 5) console.error('FAIL:', fileName.slice(0, 60), String(e.message).slice(0, 100));
    }
  }
  console.log(`rebuild: ${ok} ok, ${skip} skipped (no msgs), ${fail} fail`);

  const cnt = await turso.execute('SELECT COUNT(*) n FROM DriveFile');
  const folder = await turso.execute(`SELECT fileName, fileSize, telegramMessageId, chunkCount FROM DriveFile ORDER BY fileSize DESC LIMIT 5`);
  console.log('DriveFile total:', cnt.rows[0].n);
  console.log('top 5 by size:');
  for (const r of folder.rows) console.log(`  ${r.fileName.slice(0, 50)} | ${(Number(r.fileSize) / 1e9).toFixed(1)}GB | msg ${r.telegramMessageId} | ${r.chunkCount} chunks`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
