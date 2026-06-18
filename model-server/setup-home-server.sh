#!/bin/bash
# Hostamar Home Server Setup Script
# Run once on your home Linux server: chmod +x setup-home-server.sh && sudo ./setup-home-server.sh

set -euo pipefail

# =============================================================================
# CONFIGURATION — EDIT THESE VALUES BEFORE RUNNING
# =============================================================================
HOME_USER="romel"                    # Linux username on home server
HOME_DIR="/home/${HOME_USER}/hostamar"  # App directory
REPO_DIR="${HOME}/hostamar.com"         # Where repo is cloned (assumed)
# =============================================================================

log() { echo -e "\033[1;32m[$(date -u +%H:%M:%S)] $*\033[0m"; }
err() { echo -e "\033[1;31m[$(date -u +%H:%M:%S)] ERROR: $*\033[0m" >&2; }

# Must run as root for systemd/docker
if [ "$EUID" -ne 0 ]; then
  err "Please run as root: sudo ./setup-home-server.sh"
  exit 1
fi

log "=== Hostamar Home Server Setup Started ==="

# -----------------------------------------------------------------------------
# 1. Install Docker + Docker Compose
# -----------------------------------------------------------------------------
log "Installing Docker and Docker Compose..."
apt-get update
apt-get install -y docker.io docker-compose-plugin curl gnupg2
systemctl enable --now docker

# Verify
docker --version
docker compose version

# -----------------------------------------------------------------------------
# 2. GPU Runtime (NVIDIA)
# -----------------------------------------------------------------------------
log "Setting up NVIDIA Docker runtime..."
if [ -f "${REPO_DIR}/model-server/gpu-setup.sh" ]; then
  chmod +x "${REPO_DIR}/model-server/gpu-setup.sh"
  "${REPO_DIR}/model-server/gpu-setup.sh"
else
  log "gpu-setup.sh not found at ${REPO_DIR}/model-server/gpu-setup.sh — skipping GPU setup"
  log "You can run it manually later if needed"
fi

# -----------------------------------------------------------------------------
# 3. Prepare application directory
# -----------------------------------------------------------------------------
log "Preparing app directory at ${HOME_DIR}..."
mkdir -p "${HOME_DIR}"
chown -R "${HOME_USER}:${HOME_USER}" "${HOME_DIR}"

# Copy docker-compose.yml and systemd unit
if [ -f "${REPO_DIR}/model-server/docker-compose.yml" ]; then
  cp "${REPO_DIR}/model-server/docker-compose.yml" "${HOME_DIR}/"
  log "Copied docker-compose.yml"
else
  err "docker-compose.yml not found at ${REPO_DIR}/model-server/docker-compose.yml"
  exit 1
fi

if [ -f "${REPO_DIR}/model-server/hostamar.service" ]; then
  cp "${REPO_DIR}/model-server/hostamar.service" /etc/systemd/system/hostamar.service
  log "Installed systemd unit"
else
  err "hostamar.service not found"
  exit 1
fi

# Also copy ramp script for canary management
if [ -f "${REPO_DIR}/model-server/ramp-canary.sh" ]; then
  cp "${REPO_DIR}/model-server/ramp-canary.sh" "${HOME_DIR}/"
  chmod +x "${HOME_DIR}/ramp-canary.sh"
  chown "${HOME_USER}:${HOME_USER}" "${HOME_DIR}/ramp-canary.sh"
  log "Copied ramp-canary.sh"
fi

# -----------------------------------------------------------------------------
# 4. Configure systemd service
# -----------------------------------------------------------------------------
log "Enabling systemd service..."
systemctl daemon-reload
systemctl enable --now hostamar.service

# -----------------------------------------------------------------------------
# 5. Initial Docker Compose pull & up
# -----------------------------------------------------------------------------
log "Pulling Docker images..."
cd "${HOME_DIR}"
docker compose pull

log "Starting containers..."
docker compose up -d

# -----------------------------------------------------------------------------
# 6. Health verification
# -----------------------------------------------------------------------------
log "Waiting for services to become healthy..."
for i in {1..30}; do
  if curl -sf http://localhost/health >/dev/null 2>&1; then
    log "Health endpoint responding OK"
    break
  fi
  if [ $i -eq 30 ]; then
    err "Health check timeout after 60 seconds"
    docker compose logs --tail=50
    exit 1
  fi
  sleep 2
done

log "Checking metrics endpoint..."
curl -sf http://localhost/metrics | head -10 || log "Metrics endpoint not yet ready"

# -----------------------------------------------------------------------------
# 7. Show status
# -----------------------------------------------------------------------------
log "=== Setup Complete ==="
echo
log "Service status:"
systemctl status hostamar.service --no-pager -l
echo
log "Docker containers:"
docker compose ps
echo
log "Useful commands:"
echo "  View logs:        docker compose logs -f"
echo "  Run canary ramp:  cd ${HOME_DIR} && ./ramp-canary.sh canary 10"
echo "  Promote to stable:cd ${HOME_DIR} && ./ramp-canary.sh stable"
echo "  Restart service:  systemctl restart hostamar"
echo "  View service log: journalctl -u hostamar.service -f"
echo
log "Health check:       curl http://localhost/health"
log "Metrics (Prometheus): curl http://localhost/metrics"
log "Traefik dashboard:  http://localhost:8080 (disable in production!)"
echo
log "=== Next steps ==="
log "1. Set GitHub secrets (HOME_HOST, HOME_USER, HOME_SSH_KEY, GHCR_TOKEN) in repo"
log "2. Trigger CI: gh workflow run model-deploy.yml --ref main -R YOUR_LINUX_USERNAMEraisul/hostamar.com"
log "3. Configure DNS/TLS (Let's Encrypt or Cloudflare Tunnel)"
log "4. Harden SSH and firewall (see docs/approval-flow.md)"