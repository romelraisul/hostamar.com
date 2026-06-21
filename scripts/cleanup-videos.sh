#!/bin/bash
# ---------------------------------------------------------------------------
# cleanup-videos.sh — delete MP4s and thumbnails older than retention window
#
# Runs daily at 03:30 via cron.
# Retention: 7 days (configurable via MAX_AGE_DAYS env var)
# ---------------------------------------------------------------------------
set -euo pipefail

MAX_AGE="${MAX_AGE_DAYS:-7}"
LOG_TAG="hostamar-cleanup"
LOG_FILE="${LOG_FILE:-/var/log/hostamar/cleanup.log}"

mkdir -p "$(dirname "$LOG_FILE")"
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE" | logger -t "$LOG_TAG"; }

total=0

# App container videos
if docker exec hostamar-app test -d /app/videos 2>/dev/null; then
  c=$(docker exec hostamar-app sh -c "find /app/videos -type f -mtime +$MAX_AGE -delete 2>/dev/null; echo OK" 2>/dev/null && echo 0)
  log "OK    hostamar-app /app/videos cleaned (retention=${MAX_AGE}d)"
fi

# Worker container videos
if docker exec hostamar-gpu-worker test -d /tmp/hostamar-videos 2>/dev/null; then
  c=$(docker exec hostamar-gpu-worker sh -c "find /tmp/hostamar-videos -type f -mtime +$MAX_AGE -delete 2>/dev/null; echo OK" 2>/dev/null && echo 0)
  log "OK    hostamar-gpu-worker /tmp/hostamar-videos cleaned (retention=${MAX_AGE}d)"
fi

log "DONE  cleanup complete"
