#!/bin/bash
# Canary ramp script for model deployment
# Usage: ./ramp-canary.sh [stable|canary] [wait-minutes]

set -euo pipefail

TARGET="${1:-canary}"
WAIT_MIN="${2:-10}"
COMPOSE_FILE="/home/youruser/hostamar/docker-compose.yml"
HEALTH_ENDPOINT="http://localhost/health"
METRICS_ENDPOINT="http://localhost/metrics"

log() { echo "[$(date -u +%H:%M:%S)] $*"; }

log "Starting canary ramp to $TARGET"

# Pull latest images
log "Pulling latest images..."
docker-compose -f "$COMPOSE_FILE" pull

# Restart services
log "Restarting containers..."
docker-compose -f "$COMPOSE_FILE" up -d

# Wait for services to be healthy
log "Waiting for health checks..."
for i in $(seq 1 30); do
    if curl -sf "$HEALTH_ENDPOINT" >/dev/null 2>&1; then
        log "Health endpoint OK"
        break
    fi
    if [ $i -eq 30 ]; then
        log "ERROR: Health check timeout"
        exit 1
    fi
    sleep 2
done

# Wait for canary period
log "Canary running for ${WAIT_MIN} minutes..."
sleep "${WAIT_MIN}m"

# Check metrics
log "Checking Prometheus metrics..."
curl -sf "$METRICS_ENDPOINT" | grep -E 'hostamar_requests_total|hostamar_latency_seconds' || true

# If stable, promote canary to stable
if [ "$TARGET" = "stable" ]; then
    log "Promoting canary to stable..."
    docker tag ghcr.io/youruser/hostamar-model:canary ghcr.io/youruser/hostamar-model:stable
    docker push ghcr.io/youruser/hostamar-model:stable
    log "Promoted!"
fi

log "Ramp complete."