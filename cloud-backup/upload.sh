#!/usr/bin/env bash
# cloud-backup/upload.sh — off-machine backup so state survives if the PC dies.
# NOTE: only the `onedrive:` rclone remote is configured on this host.
#       R2 (r2:) is NOT set up — video upload to R2 is skipped until you run
#       `rclone config` and add an S3/R2 remote named `r2`.
set -uo pipefail
BUILD="/home/romel/hostamar-build"
LOG="$BUILD/logs/cloud.log"
mkdir -p "$BUILD/logs"
RCLONE="$(command -v rclone || echo /home/romel/bin/rclone)"
log() { printf '[%s] %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*" >> "$LOG"; }

log "cloud backup start"

# Guard: which remotes exist?
REMOTES="$("$RCLONE" listremotes 2>/dev/null)"

# 1. Final videos/audio -> R2 IF the remote exists, else OneDrive
if echo "$REMOTES" | grep -q '^r2:'; then
  "$RCLONE" copy "$BUILD/video-output/" r2:hostamar-videos \
    --include "*.mp4" --include "*.mp3" --quiet 2>>"$LOG" && log "videos -> r2 OK" || log "videos -> r2 FAILED"
elif echo "$REMOTES" | grep -q '^onedrive:'; then
  "$RCLONE" copy "$BUILD/video-output/" onedrive:Hostamar/videos \
    --include "*.mp4" --include "*.mp3" --quiet 2>>"$LOG" && log "videos -> onedrive OK" || log "videos -> onedrive FAILED"
else
  log "videos: NO remote (r2/onedrive) configured — skipped"
fi

# 2. Copyright registry (if it exists) -> OneDrive
if echo "$REMOTES" | grep -q '^onedrive:' && [ -d "$BUILD/copyright-db" ]; then
  "$RCLONE" copy "$BUILD/copyright-db/" onedrive:Hostamar/permanent --quiet 2>>"$LOG" \
    && log "copyright-db -> onedrive OK" || log "copyright-db -> onedrive FAILED"
fi

# 3. Guard/metrics history -> OneDrive (always worth backing up)
if echo "$REMOTES" | grep -q '^onedrive:'; then
  "$RCLONE" copy "$BUILD/state/" onedrive:Hostamar/state \
    --include "metrics.db" --include "guard_history.db" --include "run_history.db" \
    --quiet 2>>"$LOG" && log "state dbs -> onedrive OK" || log "state dbs -> onedrive FAILED"
fi

log "cloud backup done"
