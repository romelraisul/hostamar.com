#!/bin/bash
# Hostamar Remote Ollama Tunnel — start/keepalive
# Tunnels localhost:11435 → remote Ollama localhost:11434
# Used by: docker/remotion/queue for AI inference
set -e

TUNNEL_PORT=11435
REMOTE_HOST=192.168.1.2
REMOTE_USER=romel
REMOTE_PORT=11434
LOG_FILE=/tmp/ollama-tunnel.log

log() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

# Check if tunnel already alive
if ss -tlnp | grep -q ":${TUNNEL_PORT} "; then
    log "Tunnel already listening on :${TUNNEL_PORT} — OK"
    if curl -s --max-time 3 "http://localhost:${TUNNEL_PORT}/api/tags" >/dev/null 2>&1; then
        log "Ollama responds — healthy"
        exit 0
    else
        log "Port open but Ollama not responding — restarting"
        pkill -f "ssh.*${TUNNEL_PORT}:localhost:${REMOTE_PORT}" 2>/dev/null || true
        sleep 2
    fi
fi

log "Starting SSH tunnel :${TUNNEL_PORT} → ${REMOTE_HOST}:${REMOTE_PORT}..."
ssh -o ServerAliveInterval=30 \
    -o ServerAliveCountMax=3 \
    -o ExitOnForwardFailure=yes \
    -o StrictHostKeyChecking=accept-new \
    -N -L "${TUNNEL_PORT}:localhost:${REMOTE_PORT}" \
    "${REMOTE_USER}@${REMOTE_HOST}" >> "$LOG_FILE" 2>&1 &

TUNNEL_PID=$!
log "Tunnel started (PID: ${TUNNEL_PID})"

# Wait then verify
sleep 3
if curl -s --max-time 3 "http://localhost:${TUNNEL_PORT}/api/tags" >/dev/null 2>&1; then
    log "✅ Tunnel verified — Ollama reachable"
    exit 0
else
    log "❌ Tunnel verification failed"
    exit 1
fi
