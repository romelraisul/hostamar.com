#!/usr/bin/env bash
# Lightweight wake-from-sleep helper. Container restart with `docker start`
# is faster than `compose up -d --no-recreate` because it skips DNS re-checks
# for networks that already exist. We still defer to the full start script
# when Docker daemon itself has died — that requires `service docker start`
# which is irreversible mid-flight.
#
# Idempotent and safe to run on every wake event.
set -uo pipefail

COMPOSE_FILE="/home/romel/hostamar-build/docker-compose.prod.yml"
LOG_FILE="/home/romel/hostamar-build/logs/wake-restart.log"
DIR="/home/romel/hostamar-build"

mkdir -p "$(dirname "$LOG_FILE")"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [wake] $*" >> "$LOG_FILE"
}

log "=== wake triggered ==="

# If docker daemon is dead, defer to the heavier script which can restart it.
if ! docker info >/dev/null 2>&1; then
  log "Docker daemon not reachable, deferring to wsl-start-hostamar.sh"
  exec "$DIR/scripts/wsl-start-hostamar.sh"
fi

# Fast path: daemon alive, just bring compose up.
cd "$DIR"

# Tolerant: if a container was already running, leave it. This is one of two
# places the user could ask we don't restart everything from scratch.
docker compose -f "$COMPOSE_FILE" up -d --no-build --no-recreate >> "$LOG_FILE" 2>&1 || true

# Most-important containers, in priority order:
for SERVICE in hostamar-cloudflared hostamar-postgres hostamar-redis hostamar-ollama hostamar-app hostamar-model hostamar-worker; do
  STATE=$(docker inspect -f '{{.State.Running}}' "$SERVICE" 2>/dev/null || echo false)
  if [ "$STATE" != "true" ]; then
    log "Starting $SERVICE (was stopped)"
    docker start "$SERVICE" >> "$LOG_FILE" 2>&1 || log "  start failed: $SERVICE"
  fi
done

log "Stack status:"
docker compose -f "$COMPOSE_FILE" ps >> "$LOG_FILE" 2>&1 || true
log "=== wake done ==="
