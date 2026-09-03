# Hostamar Drive (V34) — Telegram MTProto as unlimited storage

Google Drive clone. Bytes live in a **private Telegram channel** (MTProto User
API — NOT the Bot API: no 2GB bot cap, no 1h getFile expiry, Range-streamable);
metadata lives in Neon (`DriveFolder` + `DriveFile`).

## Why MTProto
- Bot API: 2GB/file cap, `getFile` links expire in 1h, no chunking, no streams.
- MTProto User API: 2GB free / 4GB Premium per message, **permanent** file refs,
  Range streaming via `iterDownload`.

## One-time user setup (you do this once — the agent cannot: it's your phone/2FA)

1. **App credentials** — my.telegram.org → API Development Tools → create app
   "Hostamar Drive" → copy `api_id` + `api_hash`.
2. **Session string** (local, never on a server):
   ```
   TG_API_ID=123456 TG_API_HASH=xxxx node scripts/tg-gen-session.mjs
   ```
   Enter phone → Telegram code → 2FA. Copy `SESSION_STRING` output → env
   `TG_SESSION_STRING` (as secret as DATABASE_URL — it IS the account).
3. **Storage channel** — create a PRIVATE channel (e.g. `hostamar-drive-storage`),
   keep your account as the only admin. Get its id (`-100…` — forward a message
   from it to @userinfobot or check via the session script) → env `TG_CHANNEL_ID`.
4. Set those 4 env vars on: Vercel (`vercel env add`), VPS compose (`environment:`),
   and `.env.local` for local dev.

## Architecture
```
/drive UI (app/dashboard/drive/page.tsx)
  → /api/drive/upload    (auth cookie; SHA256 dedup; ≤2GB single message; >2GB → 1.9GB chunks)
  → /api/drive/file/[id] (GET stream + Range 206 + ?token= 1h share; DELETE revokes TG messages)
  → /api/drive/list | folder | move | share
  → lib/telegram/client.ts (GramJS singleton, flood-wait aware, WSS egress)
  → lib/telegram/upload.ts / download.ts / chunk.ts
  → Telegram channel (the disk)   |   Neon (metadata only)
```

## Honest limits (surfaced in the UI)
- 2GB/file free, 4GB Premium — larger files auto-chunked (1.9GB parts).
- Vercel request-body cap ~4.5MB → **big uploads go to the VPS deployment**
  (`https://vps.hostamar.com/api/drive/upload`) or the migration script.
- ~5-10 MB/s upload per Telegram client.
- Not E2E encrypted — encrypt sensitive files before upload.
- Telegram account ban = drive down. Don't spam with the session.

## Migrating the 240GB file off Google Drive (frees Gmail → GitHub verify email)
`scripts/migrate-to-hostamar-drive.mjs` streams `rclone` → 1.9GB temp chunks →
MTProto upload — RAM ~2GB, no Vercel in the path, resumable per chunk:

```
TG_API_ID=… TG_API_HASH=… TG_SESSION_STRING=… TG_CHANNEL_ID=-100… \
node scripts/migrate-to-hostamar-drive.mjs --src rclone:gdrive:Backups/240gb-file.bin --name 240gb-backup.bin
```

After upload verify, then free the Google side:
```
rclone delete gdrive:Backups/240gb-file.bin
rclone cleanup gdrive:          # purge trash (trash still counts against quota!)
```
⚠️ Google Drive **trash still uses quota** — `rclone cleanup` (empty trash) is
what actually frees Gmail space. GitHub's verification email should then arrive
(Gmail over-quota bounces mail — that's why it never showed up).

## Registering migrated chunks in the UI
The migration script prints `chunkGroupId` + `messageIds`. Insert a DriveFile
head row with those (or upload the same content once via the API to let dedup
point at it). Do **not** re-upload 240GB through the web UI.
