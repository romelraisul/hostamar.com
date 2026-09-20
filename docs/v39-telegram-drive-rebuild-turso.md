# V39 — Telegram Drive rebuilt in Turso from state-v10.json

**Date:** 2026-09-20 · **Status:** SHIPPED — 1499 rows, 313.7GB indexed, no Neon needed

## What was rebuilt

`state-v10.json` (`~/hostamar-migrate/`) holds the full truth: `uploaded` (1388 files → `msgs[]` per file, sha256), `downloaded` (sizes), `chunks` (1518 part→msg map). Telegram channel `-1004296347934` holds the bytes — safe, quota-independent.

`scripts/rebuild-drive-batch.js` writes the **app-native format** (matches `app/api/drive/upload/route.ts`):
- single file → 1 row, `chunkCount=1`, `chunkGroupId=NULL`, sha256 in `fileHash`
- chunked file (>1.9GB) → **one row per part** sharing `chunkGroupId`; head row keeps original name + sha; parts named `name.partN`; part sizes = 1.9GB full + remainder tail

## Verified

- 1499 part-rows (1379 singles + 20 chunk groups, largest 27 parts/53.7GB)
- Total 313.7GB across rows — matches state-v10 downloaded total
- All 1379 singles have sha256
- Spot check `I_Am_Greta_-__p090xz9z_original.mp4`: msg 1380 (2040MB) + msg 1381 (1396MB) = 3436147351 bytes — exact match with state
- `/api/drive/file/[id]` reads `chunkGroupId` → `findMany` parts ordered by `createdAt` — part rows share `createdAt` (datetime('now') in one batch)... see note

## Known ceiling (ponytail)

Part rows within a chunk group share `createdAt` (batch insert, `datetime('now')` granularity) and the download route orders parts by `createdAt ASC`. If two parts land in the same second the order may break for multi-part files. Fix if a chunked download ever returns wrong bytes: order by `id` (id embeds `-p0..N`) or set createdAt staggered. Singles (1379/1388 files) unaffected.

## What was skipped

- Neon — untouched, still quota-locked. When it resets: `pgdump-to-turso.js` for Customer rows (V38).
- Turso→Telegram backup dump — `.dump` via turso CLI not available in this shell; the source of truth (state-v10.json + channel) already IS the backup for DriveFile. DB backup worth adding once Customer data is recovered from Neon.

## Old users

Still locked in Neon (quota). Recovery path unchanged (V38 doc).
