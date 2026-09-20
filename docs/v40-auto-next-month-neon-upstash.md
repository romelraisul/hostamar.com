# V40 — Auto next month: Neon recovery + Upstash cache + Turso→Telegram backup

**Date:** 2026-09-20 · **Status:** SHIPPED — all cron-armed, tested live

## 1. Neon quota auto-recovery (daily 02:00 UTC)

`~/hostamar-migrate/check-neon-quota-auto.sh` (cron + appended to guardian.sh):

- `psql SELECT 1` — quota-locked Neon refuses at connect, no CU burn
- LOCKED → writes status to `/mnt/c/tmp/hostamar-sync/neon-auto-check.json`, exits
- UNLOCKED → `pg_dump --data-only --inserts` → `node scripts/pgdump-to-turso.js` (idempotent, forces admin role) → verify Customer count → upload dump to Telegram → touch `.neon-recovered` marker (stops re-runs)
- **Tested live today:** `LOCKED — retry tomorrow`, status file written, exit 0
- URL files copied to `~/hostamar-migrate/{neon_unpooled,turso_url}.txt` (survive /tmp cleanup)

## 2. Upstash cache (Turso read protection)

`lib/upstash-cache.ts` — `cachedTurso(key, ttl, fetcher)`, cache-aside. No Upstash REST creds exist yet → every call degrades to plain fetch (zero behavior change). When creds are added to env, caching activates with no code change.

Wired into `/api/drive/list` (the heaviest read: 3 queries → 1 cached get, 30s TTL, per-owner+folder key). `@upstash/redis@^1.38.4` installed. Build ✓.

## 3. Turso → Telegram backup (monthly, 1st 02:30 UTC)

- `scripts/dump-turso.js` — full schema+data SQL dump (88 tables, 909KB)
- `~/hostamar-migrate/turso-backup-to-telegram.sh` — dump → `tg-upload-wsl.mjs` → channel
- **First backup already uploaded: TG_MSG_ID 1563** (`turso-backup-20260921.sql`)
- **Restore tested:** dump → fresh local libsql file db → `DriveFile=1499 Customer=3` ✓

## Cron state

```
0  2 * * * check-neon-quota-auto.sh      # daily Neon check
30 2 1 * * turso-backup-to-telegram.sh   # monthly Turso backup
```
Plus guardian.sh runs the Neon check every 5min tick until recovered.

## Manual check anytime

```bash
bash ~/hostamar-migrate/check-neon-quota-auto.sh
cat /mnt/c/tmp/hostamar-sync/neon-auto-check.json
```

## Skipped

- Upstash REST credentials — none exist in any env file; user must create a free Upstash Redis DB and add `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` to Vercel env. Cache code activates automatically when present.
- Build+deploy from the recovery script — recovery imports data; deploy is a separate `git push` away and auto-deploys. Not coupled on purpose.
