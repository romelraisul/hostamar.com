#!/bin/bash
# ---------------------------------------------------------------------------
# backup-videos.sh — daily sync of /app/videos to remote storage
#
# Requires: aws cli configured (or rclone / s5cmd)
# Schedule: daily at 04:00 (systemd timer or cron)
#
# Usage:
#   bash scripts/backup-videos.sh                        # dry-run
#   bash scripts/backup-videos.sh --apply                # live sync
# ---------------------------------------------------------------------------
set -euo pipefail

DRY_RUN=true
[[ "${1:-}" = "--apply" ]] && DRY_RUN=false

BUCKET="${BACKUP_BUCKET:-s3://hostamar-backups/videos}"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

log() { echo "[$TIMESTAMP] $*" | tee -a /var/log/hostamar/backup.log; }

if $DRY_RUN; then
  log "DRY-RUN: would sync /app/videos → $BUCKET"
  echo "  Files to sync:"
  docker exec hostamar-app sh -c 'find /app/videos -type f -name "*.mp4" -o -name "*.jpg"' 2>/dev/null | wc -l
  echo "  Add --apply to execute"
  exit 0
fi

log "Starting backup to $BUCKET"

# Copy from app container to a temp dir, then sync
TMPDIR=$(mktemp -d)
docker cp hostamar-app:/app/videos "$TMPDIR/videos" 2>/dev/null || {
  docker exec hostamar-app sh -c 'tar czf /tmp/videos-backup.tar.gz -C /app videos'
  docker cp hostamar-app:/tmp/videos-backup.tar.gz "$TMPDIR/"
  tar xzf "$TMPDIR/videos-backup.tar.gz" -C "$TMPDIR"
}

if command -v aws &>/dev/null; then
  aws s3 sync "$TMPDIR/videos" "$BUCKET" --storage-class STANDARD_IA --delete
  log "Backup complete (aws s3 sync)"
elif command -v rclone &>/dev/null; then
  rclone sync "$TMPDIR/videos" "$BUCKET" --progress
  log "Backup complete (rclone sync)"
else
  log "No sync tool found (install aws-cli or rclone)"
  ls -la "$TMPDIR/videos"
fi

rm -rf "$TMPDIR"
log "Backup finished"
