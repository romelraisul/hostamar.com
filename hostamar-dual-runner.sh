#!/usr/bin/env bash
# hostamar-dual-runner.sh — WSL crontab @reboot mirror of the ps1.
# Boots Ollama :11434 (Docker preferred, Podman fallback) + LiteLLM :4000.
# Schedule: `crontab -e` -> "@reboot $HOME/hostamar-build/hostamar-dual-runner.sh"
set -u
BUILD="$HOME/hostamar-build"
CFG="$BUILD/litellm-config.final.yaml"
COMPOSE="$BUILD/docker-compose.dev.yml"
VHDX="/mnt/c/Users/User/AppData/Local/Docker/wsl/main/ext4.vhdx"
LOG="$BUILD/dual-runner.log"
log(){ echo "$(date '+%F %T') $*" | tee -a "$LOG" >/dev/null; }

log "=== BOOT CHECK ==="

# ---- 1. Docker health ----
docker_ok=1
if ! docker ps >/dev/null 2>&1 || docker ps 2>&1 | grep -qiE "NUL|cannot|error|not running"; then
  docker_ok=0
fi
if [ -f "$VHDX" ]; then
  sz=$(stat -c%s "$VHDX" 2>/dev/null || echo 0)
  if [ "$sz" -lt 52428800 ]; then
    log "WARN ext4.vhdx corrupted ($sz < 50MB) -> delete + wsl shutdown"
    wsl --shutdown 2>/dev/null; sleep 3
    sudo rm -f "$VHDX" 2>/dev/null
    docker_ok=0
  fi
fi

# ---- 2. Boot Ollama ----
if [ "$docker_ok" -eq 1 ]; then
  log "Docker healthy -> docker compose up"
  docker compose -f "$COMPOSE" up -d >/dev/null 2>&1
  command -v podman >/dev/null 2>&1 && podman machine start hostamar >/dev/null 2>&1
else
  log "Docker corrupt -> Podman failover"
  if command -v podman >/dev/null 2>&1; then
    podman machine start hostamar >/dev/null 2>&1
    podman-compose -f "$COMPOSE" up -d >/dev/null 2>&1
    log "Ollama via Podman on :11434"
  else
    log "CRITICAL: podman not installed. Run: winget install RedHat.Podman ; podman machine init hostamar --cpus 6 --memory 10240 --disk-size 100"
  fi
fi

sleep 5

# ---- 3. Verify Ollama ----
if curl -s -m 5 http://localhost:11434/api/tags >/dev/null 2>&1; then
  log "VERIFY Ollama :11434 UP"
else
  log "Ollama DOWN -> restart"
  docker restart ollama-dev >/dev/null 2>&1 || true
  podman restart ollama-dev  >/dev/null 2>&1 || true
fi

# ---- 4. LiteLLM router (WORKING mount path) ----
docker rm -f hostamar-router 2>/dev/null
podman rm -f hostamar-router 2>/dev/null
if command -v podman >/dev/null 2>&1; then
  podman run -d --name hostamar-router --network host \
    -v "$CFG:/tmp/cfg.yaml:ro" \
    -e NVIDIA_API_KEY="${NVIDIA_API_KEY:-}" \
    -e KILOCODE_API_KEY="${KILOCODE_API_KEY:-}" \
    ghcr.io/berriai/litellm:main-latest --config /tmp/cfg.yaml --port 4000 >/dev/null 2>&1
  log "Router started (Podman)"
else
  docker run -d --name hostamar-router --network host \
    -v "$CFG:/tmp/cfg.yaml:ro" \
    -e NVIDIA_API_KEY="${NVIDIA_API_KEY:-}" \
    -e KILOCODE_API_KEY="${KILOCODE_API_KEY:-}" \
    ghcr.io/berriai/litellm:main-latest --config /tmp/cfg.yaml --port 4000 >/dev/null 2>&1
  log "Router started (Docker)"
fi

sleep 5
if curl -s -m 5 http://localhost:4000/v1/models >/dev/null 2>&1; then
  log "VERIFY router :4000 UP"
else
  log "WARN router :4000 still booting or down - check logs"
fi
log "=== BOOT DONE ==="
