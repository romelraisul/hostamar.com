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
#    hostamar-tv-rtmp was PRUNED (2026-09-15) — recreate from docker/tv-station
#    compose spec if missing (only 1935 mapped; container 8080 conflicts with
#    the local LLM gateway).
if ! podman ps --format '{{.Names}}' | grep -qx 'hostamar-tv-rtmp'; then
  podman rm -f hostamar-tv-rtmp >/dev/null 2>&1 || true
  log "recreating hostamar-tv-rtmp container"
  podman run -d --name hostamar-tv-rtmp --restart unless-stopped \
    -p 1935:1935 \
    -v "$REPO/docker/tv-station/nginx.conf:/etc/nginx/nginx.conf:ro" \
    -v hls-data:/tmp/hls \
    docker.io/alfg/nginx-rtmp:latest >/dev/null 2>&1 \
    || log "WARN: could not recreate hostamar-tv-rtmp"
fi

# 2) Ensure user systemd TV units are active. Use `start` (idempotent) and
#    rely on Restart=always / enabled for resilience.
for u in tv-db tv-rtmp tv-ffmpeg tv-no-repeat-watcher tv-ever-fresh tv-hls2 tv-ffmpeg-vp9; do
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
