#!/bin/bash
# ---------------------------------------------------------------------------
# backup-videos.sh — local compressed archive of /app/videos
#
# Creates timestamped tar.gz archives in BACKUP_DIR.
# No S3, no cloud dependencies.
#
# Usage:
#   bash scripts/backup-videos.sh              # dry-run
#   bash scripts/backup-videos.sh --apply      # create backup
#   bash scripts/backup-videos.sh --list       # list existing backups
#   bash scripts/backup-videos.sh --restore N  # restore backup N (1 = latest)
# ---------------------------------------------------------------------------
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/home/romel/hostamar-backups}"
MAX_BACKUPS="${MAX_BACKUPS:-14}"  # keep 14 days of backups
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
mkdir -p "$BACKUP_DIR"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

case "${1:-}" in
  --list)
    echo "=== Existing backups ==="
    ls -lh "$BACKUP_DIR"/videos-backup-*.tar.gz 2>/dev/null | awk '{print NR, $5, $6, $7, $8, $9}' || echo "(none)"
    exit 0
    ;;

  --restore)
    shift
    N="${1:-1}"
    FILE=$(ls -t "$BACKUP_DIR"/videos-backup-*.tar.gz 2>/dev/null | sed -n "${N}p")
    if [ -z "$FILE" ]; then
      echo "Backup #$N not found. Use --list to see available backups."
      exit 1
    fi
    log "Restoring from: $FILE"
    docker exec hostamar-app sh -c "mkdir -p /app/videos"
    docker cp "$FILE" "hostamar-app:/tmp/restore.tar.gz"
    docker exec hostamar-app sh -c "tar xzf /tmp/restore.tar.gz -C / && rm /tmp/restore.tar.gz"
    log "✅ Restored. Files in /app/videos/:"
    docker exec hostamar-app sh -c "ls /app/videos/ 2>/dev/null | wc -l" | xargs echo "  count:"
    exit 0
    ;;
esac

DRY_RUN=true
[[ "${1:-}" = "--apply" ]] && DRY_RUN=false

if $DRY_RUN; then
  log "DRY-RUN: would create backup at $BACKUP_DIR/videos-backup-$TIMESTAMP.tar.gz"
  echo "  Source: hostamar-app:/app/videos/"
  COUNT=$(docker exec hostamar-app sh -c 'find /app/videos -type f 2>/dev/null | wc -l' 2>/dev/null || echo 0)
  SIZE=$(docker exec hostamar-app sh -c 'du -sh /app/videos 2>/dev/null | cut -f1' 2>/dev/null || echo "?")
  echo "  Files: $COUNT, Size: $SIZE"
  echo "  Run with --apply to execute"
  exit 0
fi

log "Creating backup: $BACKUP_DIR/videos-backup-$TIMESTAMP.tar.gz"

# Copy videos out of container and compress
TMPDIR=$(mktemp -d)
docker cp hostamar-app:/app/videos "$TMPDIR/videos" 2>/dev/null || {
  # Fallback: tar inside container then copy
  docker exec hostamar-app sh -c "tar czf /tmp/videos-backup.tar.gz -C /app videos"
  docker cp hostamar-app:/tmp/videos-backup.tar.gz "$TMPDIR/"
  tar xzf "$TMPDIR/videos-backup.tar.gz" -C "$TMPDIR"
  docker exec hostamar-app rm -f /tmp/videos-backup.tar.gz
}

tar czf "$BACKUP_DIR/videos-backup-$TIMESTAMP.tar.gz" -C "$TMPDIR" videos
rm -rf "$TMPDIR"

BACKUP_SIZE=$(stat -c%s "$BACKUP_DIR/videos-backup-$TIMESTAMP.tar.gz" 2>/dev/null || echo 0)
log "✅ Backup saved: $BACKUP_DIR/videos-backup-$TIMESTAMP.tar.gz ($(( BACKUP_SIZE / 1024 )) KB)"

# Prune old backups
COUNT=$(ls -1 "$BACKUP_DIR"/videos-backup-*.tar.gz 2>/dev/null | wc -l)
if [ "$COUNT" -gt "$MAX_BACKUPS" ]; then
  TO_DELETE=$(( COUNT - MAX_BACKUPS ))
  ls -t "$BACKUP_DIR"/videos-backup-*.tar.gz | tail -"$TO_DELETE" | while read f; do
    rm -f "$f"
    log "  Pruned: $(basename "$f")"
  done
fi

log "✅ Done. $(ls -1 "$BACKUP_DIR"/videos-backup-*.tar.gz 2>/dev/null | wc -l) backups retained."
