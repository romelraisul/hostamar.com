#!/usr/bin/env bash
# Idempotent wsl-side helper invoked by Windows Task Scheduler on logon.
# Restarts Docker if it died, then brings up the compose stack.
set -uo pipefail

COMPOSE_FILE="/home/romel/hostamar-build/docker-compose.prod.yml"
LOG_FILE="/home/romel/hostamar-build/logs/autostart.log"
MAX_WAIT=90

mkdir -p "$(dirname "$LOG_FILE")"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ws-start] $*" >> "$LOG_FILE"
}

log "=== wsl-start triggered ==="

# Idempotent: if docker daemon is up, this is a no-op. Otherwise start it.
if ! docker info >/dev/null 2>&1; then
  log "Docker not running, attempting to start service..."
  if command -v service >/dev/null 2>&1; then
    sudo -n service docker start >> "$LOG_FILE" 2>&1 || \
      sudo service docker start >> "$LOG_FILE" 2>&1 || \
      log "service docker start failed"
  fi
fi

# Wait for daemon
for i in $(seq 1 "$MAX_WAIT"); do
  if docker info >/dev/null 2>&1; then
    log "Docker ready after ${i}s"
    break
  fi
  sleep 1
  if [ "$i" -eq "$MAX_WAIT" ]; then
    log "ERROR: Docker not ready after ${MAX_WAIT}s"
    exit 1
  fi
done

cd /home/romel/hostamar-build

# Ensure the hostamar-network exists (often preserved across restarts, but
# if the bridge was removed via WSL rebuild, this brings it back).
docker network inspect hostamar-build_default >/dev/null 2>&1 || \
  docker network create hostamar-build_default

# Idempotent bring-up.
docker compose -f "$COMPOSE_FILE" up -d --no-build --no-recreate >> "$LOG_FILE" 2>&1 || true

log "Stack status:"
docker compose -f "$COMPOSE_FILE" ps >> "$LOG_FILE" 2>&1 || true

log "=== wsl-start done ==="
