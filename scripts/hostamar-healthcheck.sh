#!/bin/bash
# ---------------------------------------------------------------------------
# hostamar-healthcheck.sh — lightweight supervisor for Hostamar containers
# Runs every 2 minutes via cron or Task Scheduler.
#
# Checks: app, worker, tailscale-socat
# Action: restart unhealthy container, log to syslog
# ---------------------------------------------------------------------------
set -euo pipefail

LOG_TAG="hostamar-health"
CONTAINERS=(
  "hostamar-app:3000"
  "hostamar-gpu-worker"
  "wsl-tailscale"
)

log()   { logger -t "$LOG_TAG" "$*"; echo "[$(date +%H:%M:%S)] $*"; }

for entry in "${CONTAINERS[@]}"; do
  name="${entry%%:*}"
  port="${entry##*:}"

  # Check container is running
  if ! docker inspect --format '{{.State.Status}}' "$name" 2>/dev/null | grep -q running; then
    log "WARN  $name is not running — restarting"
    docker restart "$name" 2>/dev/null && log "OK    $name restarted" || log "FAIL  $name restart failed"
    continue
  fi

  # If entry has a port, do HTTP health check
  if [ "$port" != "$name" ] && [ -n "$port" ]; then
    if ! curl -fsS "http://127.0.0.1:$port/api/health" >/dev/null 2>&1; then
      log "WARN  $name (port $port) health check failed — restarting"
      docker restart "$name" 2>/dev/null && log "OK    $name restarted" || log "FAIL  $name restart failed"
    fi
  fi
done

# Also restart the video upload server in the app container if down
if docker exec hostamar-app sh -c 'wget -q -T 3 -O /dev/null http://127.0.0.1:8899/ 2>/dev/null'; then
  : # video proxy ok
else
  log "WARN  video proxy (8899) in hostamar-app unreachable — restarting app"
  docker restart hostamar-app
fi

# Ensure worker HTTP file server is running (serves videos to app proxy)
if ! docker exec hostamar-gpu-worker sh -c 'wget -q -T 3 -O /dev/null http://127.0.0.1:8899/ 2>/dev/null'; then
  log "WARN  worker HTTP server (8899) not running — starting"
  docker exec -d hostamar-gpu-worker sh -c 'nohup python3 -m http.server 8899 --directory /tmp/hostamar-videos > /dev/null 2>&1 &'
  log "OK    worker HTTP server started"
fi
