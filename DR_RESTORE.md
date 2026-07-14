# Hostamar Disaster Recovery — Restore Runbook (new PC)

If the PC dies / Docker VM wipes (the "44 -> 13 containers" event), follow this
on a fresh Windows 11 + WSL Ubuntu + Docker Desktop. Total restore ~10 min
(minus the 101G model re-download, which is Tier 3 / re-downloadable).

## 0. Prereqs on new PC
- Install Docker Desktop, enable **WSL Integration: Ubuntu = ON**
- `wsl --install` if needed; clone repo:
  `git clone <your-repo> /home/romel/hostamar-build`
- Install rclone (WSL): `curl https://rclone.org/install.sh | sudo bash`
  then `rclone config` -> New remote -> `onedrive` -> log in as `romelraisul@outlook.com`
- `git update-index --assume-unchanged .env.docker` (keep local secrets out of git)

## 1. Recreate external deps (these live OUTSIDE compose, survive VM wipe normally,
    but recreate if absent):
```bash
docker network create hostamar-network
docker volume create flociops-assistant_ollama-data
docker volume create cloudflared-config
```

## 2. Pull latest backup from OneDrive:
```bash
rclone copy onedrive:hostamar-backups /home/romel/restore -v
LATEST=$(ls -1t /home/romel/restore/hostamar-*.sql.gz | head -1)
```

## 3. Bring up DB + redis (compose creates postgres/redis volumes fresh):
```bash
cd /home/romel/hostamar-build
docker compose --env-file .env.docker up -d postgres redis
# wait for postgres healthy:
docker exec hostamar-postgres pg_isready -U hostamar
```

## 4. Restore the database (this is your users + admin):
```bash
gunzip -c "$LATEST" | docker exec -i hostamar-postgres pg_restore -U postgres -d hostamar --clean --if-exists || \
gunzip -c "$LATEST" | docker exec -i hostamar-postgres psql -U postgres -d hostamar
```

## 5. Restore encrypted .env.docker:
```bash
ENC=$(ls -1t /home/romel/restore/.env.docker.*.enc | head -1)
openssl enc -d -aes-256-cbc -pbkdf2 -pass pass:"$BACKUP_PASSWORD" -in "$ENC" -out /home/romel/hostamar-build/.env.docker
```

## 6. Bring up the rest:
```bash
docker compose --env-file .env.docker up -d
curl -f http://localhost:3000/api/health   # expect 200
```

## 7. Admin login
Your admin `romelraisul@outlook.com` is in the restored `Customer` table with
role `admin` — NO new signup needed, log in with the same password as before.

> NOTE: The DR plan's master prompt suggested `UPDATE "User" SET role='admin'`.
> That is WRONG for this schema — the account table is `Customer`
> (prisma/schema.prisma line 51), NOT `User`. Use `create-admin.js`
> (which upserts `Customer` correctly) or the restore above. Do NOT run the
> `User` SQL — it silently affects nothing.

## 8. Re-download the 101G models (Tier 3, not backed up):
```bash
cd /home/romel/hostamar-build/video-pipeline-lowvram
# run install-lowvram.sh (needs YOUR HuggingFace token) OR the per-file
# huggingface-cli commands documented in MISSING_MODELS.md
```

```
# 9. OneDrive DR cron (so this never happens again):
crontab -e
# add: * * * * * BACKUP_PASSWORD='your-32-char-pass' /home/romel/hostamar-backup/hostamar-backup.sh
```

---

## APPENDIX A — Backup scripts (rebuild these on a new PC if wiped)

Place under `/home/romel/hostamar-backup/`, `chmod +x *.sh`. Requires rclone
remote `onedrive:` (run `onedrive-setup.sh` once with browser OAuth).

### `wsl-pg-dump.sh`
```bash
#!/bin/bash
set -euo pipefail
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_DIR=/home/romel/backup
mkdir -p "$BACKUP_DIR"
TMP="$BACKUP_DIR/hostamar-$DATE.sql.gz.tmp"
FINAL="$BACKUP_DIR/hostamar-$DATE.sql.gz"
if docker exec hostamar-postgres pg_dump -U postgres -Fc -Z9 hostamar > "$TMP" 2>/tmp/pg-dump.log; then
  :
else
  docker exec hostamar-postgres pg_dump -U postgres hostamar | gzip -9 > "$TMP"
fi
mv -f "$TMP" "$FINAL"
ls -1t "$BACKUP_DIR"/hostamar-*.sql.gz 2>/dev/null | tail -n +1441 | xargs -r rm -f
echo "$FINAL"
```

### `hostamar-backup.sh`
```bash
#!/bin/bash
set -uo pipefail
BACKUP_PASSWORD="${BACKUP_PASSWORD:-CHANGE_ME_32_CHAR_MINIMUM}"
RCLONE=/home/romel/bin/rclone
REMOTE="onedrive:hostamar-backups"
WSL_BACKUP=/home/romel/backup
REPO=/home/romel/hostamar-build
DATE=$(date +%Y-%m-%d_%H-%M-%S)
DAY=$(date +%Y-%m-%d)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DUMP=$("$SCRIPT_DIR/wsl-pg-dump.sh"); DUMP=$(echo "$DUMP" | tail -1)
if [ $(date +%M) -eq 0 ] || [ ! -f "$WSL_BACKUP/.env.docker.enc" ]; then
  openssl enc -aes-256-cbc -pbkdf2 -pass "pass:$BACKUP_PASSWORD" \
    -in "$REPO/.env.docker" -out "$WSL_BACKUP/.env.docker.$DATE.enc.tmp"
  mv -f "$WSL_BACKUP/.env.docker.$DATE.enc.tmp" "$WSL_BACKUP/.env.docker.$DATE.enc"
fi
if [ $(date +%u) -eq 7 ] && [ $(date +%H) -eq 3 ]; then
  docker exec hostamar-redis redis-cli SAVE 2>/dev/null || true
  docker run --rm -v hostamar-build_minio-data:/data -v "$WSL_BACKUP":/backup alpine \
    tar -czf "/backup/minio-$DAY.tar.gz" -C /data . 2>/dev/null || true
fi
find "$REPO/video-pipeline-lowvram/models" -type f -exec ls -la {} \; > "$WSL_BACKUP/models-manifest.txt" 2>/dev/null || true
"$RCLONE" copy "$WSL_BACKUP" "$REMOTE/$DAY" \
  --include "hostamar-*.sql.gz" --include ".env.docker.*.enc" --include "models-manifest.txt" \
  --retries 10 --low-level-retries 10 --transfers 1 --checkers 1 \
  --log-file "$WSL_BACKUP/rclone.log" --log-level INFO
"$RCLONE" delete "$REMOTE" --min-age 7d --rmdirs 2>/dev/null || true
echo "BACKUP OK $DATE -> $REMOTE/$DAY"
```

### `onedrive-setup.sh` (run ONCE, opens browser)
```bash
#!/bin/bash
set -euo pipefail
RCLONE=/home/romel/bin/rclone
"$RCLONE" config   # New remote -> onedrive -> romelraisul@outlook.com -> OneDrive Personal
"$RCLONE" lsd onedrive:   # verify
```

