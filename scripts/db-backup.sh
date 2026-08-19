#!/bin/bash
# Hostamar DB backup to MinIO
# Runs: daily via cron
set -e

BACKUP_DIR="/tmp/hostamar-db-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_URL="postgresql://neondb_owner:***REDACTED***@ep-empty-firefly-apkx8hzh.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require"
S3_ENDPOINT="http://192.168.1.2:9000"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_BUCKET="hostamar"
S3_PATH="backups/db"

mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/hostamar-db-$TIMESTAMP.sql.gz"
LOG_FILE="/tmp/db-backup.log"

echo "[$(date)] Starting backup..." >> "$LOG_FILE"

# Dump and compress
pg_dump "$DB_URL" 2>> "$LOG_FILE" | gzip > "$BACKUP_FILE"
echo "[$(date)] Backup created: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))" >> "$LOG_FILE"

# Upload to MinIO
curl -s -X PUT "$S3_ENDPOINT/$S3_BUCKET/$S3_PATH/hostamar-db-$TIMESTAMP.sql.gz" \
  --user "$S3_ACCESS_KEY:$S3_SECRET_KEY" \
  --data-binary @"$BACKUP_FILE" >> "$LOG_FILE" 2>&1
echo "[$(date)] Uploaded to MinIO" >> "$LOG_FILE"

# Keep last 7 backups, delete older
for old in $(ls -t "$BACKUP_DIR"/hostamar-db-*.sql.gz 2>/dev/null | tail -n +8); do
  rm -f "$old"
  echo "[$(date)] Cleaned old backup: $old" >> "$LOG_FILE"
done

echo "[$(date)] Backup complete" >> "$LOG_FILE"
