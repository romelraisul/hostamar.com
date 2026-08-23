#!/bin/bash
# start_tv_stack.sh — Idempotent hostamar TV boot/restart.
# Safe to run repeatedly (no-op if already up). Used by:
#   - Windows auto_start.ps1 at logon (electricity restart recovery)
#   - tv-health-check.timer auto-heal loop
#   - manual `bash scripts/tv/start_tv_stack.sh`
#
# Podman-only. Brings up containers + user systemd units in correct order.
set -u

REPO="/home/romel/hostamar-build"
log() { echo "[$(date '+%H:%M:%S') start-tv] $*"; }

# 1) Ensure podman containers are running (restart policies cover crashes,
#    but after a cold boot they may need an explicit start).
for c in hostamar-tv-db hostamar-tv-rtmp hostamar-nginx; do
  if ! podman ps --format '{{.Names}}' | grep -qx "$c"; then
    if podman ps -a --format '{{.Names}}' | grep -qx "$c"; then
      log "starting container $c"
      podman start "$c" >/dev/null 2>&1 || log "WARN: podman start $c failed"
    else
      log "NOTE: container $c not present (skip)"
    fi
  fi
done

# 2) Ensure user systemd TV units are active. Use `start` (idempotent) and
#    rely on Restart=always / enabled for resilience.
for u in tv-db tv-rtmp tv-ffmpeg tv-no-repeat-watcher tv-ever-fresh tv-hls2; do
  if ! systemctl --user is-active --quiet "$u.service" 2>/dev/null; then
    log "starting unit $u"
    systemctl --user start "$u.service" 2>/dev/null || log "WARN: start $u failed"
  fi
done

# 3) Verify ffmpeg is actually streaming a valid file (corrupt render guard).
sleep 3
if ! systemctl --user is-active --quiet tv-ffmpeg.service 2>/dev/null; then
  log "tv-ffmpeg still down after start; force_restart may be needed"
  python3 "$REPO/scripts/tv/force_restart.py" >/dev/null 2>&1 || true
fi

log "TV stack ensure-complete"
