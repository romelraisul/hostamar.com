#!/bin/bash
# =============================================================================
# Hostamar — One-command VPS Deploy Script
# =============================================================================
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# Prerequisites:
#   - Docker & Docker Compose plugin installed on the VPS
#   - .env.production file exists with all required variables
#   - Git remote is configured and you have pull access
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Rollback function (defined before use)
# ---------------------------------------------------------------------------
rollback() {
    echo ""
    warn "============================================"
    warn "  ROLLBACK IN PROGRESS"
    warn "============================================"

    # Stop the new deployment
    docker compose -f "$COMPOSE_FILE" down 2>/dev/null || true

    # Restore previous images if they exist
    APP_ROLLBACK=$(docker images --format '{{.Repository}}:{{.Tag}}' | grep "$ROLLBACK_TAG-app" | head -1 || true)
    WORKER_ROLLBACK=$(docker images --format '{{.Repository}}:{{.Tag}}' | grep "$ROLLBACK_TAG-worker" | head -1 || true)

    if [ -n "$APP_ROLLBACK" ]; then
        info "Restoring app image from snapshot..."
        docker tag "$APP_ROLLBACK" "$(docker inspect --format '{{.Config.Image}}' "$APP_ROLLBACK" 2>/dev/null || echo 'hostamar-app:latest')" 2>/dev/null || true
    fi

    # Restart the previous deployment
    if docker compose -f "$COMPOSE_FILE" up -d 2>&1; then
        ok "Rollback completed — previous version is now running."
    else
        fail "Rollback failed! Manual intervention required."
        fail "Try: docker compose -f ${COMPOSE_FILE} up -d"
    fi
}

# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Colors & helpers
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $1"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
fail()  { echo -e "${RED}[FAIL]${NC}  $1"; }

# ---------------------------------------------------------------------------
# Configuration (override via environment variables)
# ---------------------------------------------------------------------------
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
HEALTH_URL="${HEALTH_URL:-http://localhost:3000}"
HEALTH_RETRIES="${HEALTH_RETRIES:-30}"
HEALTH_INTERVAL="${HEALTH_INTERVAL:-2}"
BRANCH="${BRANCH:-main}"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

cd "$PROJECT_DIR"

# ---------------------------------------------------------------------------
# Header
# ---------------------------------------------------------------------------
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║            Hostamar — VPS Deployment                        ║"
echo "║            $(date '+%Y-%m-%d %H:%M:%S UTC')                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------
info "Running pre-flight checks..."

# Check Docker
if ! command -v docker &>/dev/null; then
    fail "Docker is not installed. Install it first:"
    fail "  curl -fsSL https://get.docker.com | sh"
    exit 1
fi

# Check Docker Compose plugin
if ! docker compose version &>/dev/null; then
    fail "Docker Compose plugin is not installed."
    fail "  sudo apt install docker-compose-plugin   # Debian/Ubuntu"
    fail "  or install via Docker Desktop / buildx plugin"
    exit 1
fi

# Check environment file
if [ ! -f "$ENV_FILE" ]; then
    fail "Environment file not found: $ENV_FILE"
    fail "Create it from the example:"
    fail "  cp .env.production.example $ENV_FILE"
    fail "Then edit $ENV_FILE with your production values."
    exit 1
fi

# Check Docker Compose file
if [ ! -f "$COMPOSE_FILE" ]; then
    fail "Compose file not found: $COMPOSE_FILE"
    exit 1
fi

ok "All pre-flight checks passed"

# ---------------------------------------------------------------------------
# Step 1: Pull latest code
# ---------------------------------------------------------------------------
echo ""
info "Step 1/5: Pulling latest code from origin/${BRANCH}..."

if ! git pull origin "$BRANCH" 2>&1; then
    fail "Git pull failed. Check your remote and working tree."
    fail "Resolve conflicts or stash changes, then re-run."
    exit 1
fi

ok "Code is up to date (commit: $(git rev-parse --short HEAD))"

# ---------------------------------------------------------------------------
# Step 2: Snapshot current images for rollback
# ---------------------------------------------------------------------------
echo ""
info "Step 2/5: Saving rollback snapshot..."

ROLLBACK_TAG="hostamar-rollback-$(date +%s)"

# Capture current image IDs before rebuilding
CURRENT_APP_IMAGE=$(docker compose -f "$COMPOSE_FILE" images -q app 2>/dev/null || true)
CURRENT_WORKER_IMAGE=$(docker compose -f "$COMPOSE_FILE" images -q worker 2>/dev/null || true)

if [ -n "$CURRENT_APP_IMAGE" ]; then
    docker tag "hostamar-app:latest" "$ROLLBACK_TAG-app" 2>/dev/null || true
    info "  Saved app image → $ROLLBACK_TAG-app"
fi
if [ -n "$CURRENT_WORKER_IMAGE" ]; then
    docker tag "hostamar-worker:latest" "$ROLLBACK_TAG-worker" 2>/dev/null || true
    info "  Saved worker image → $ROLLBACK_TAG-worker"
fi

if [ -z "$CURRENT_APP_IMAGE" ] && [ -z "$CURRENT_WORKER_IMAGE" ]; then
    warn "  No existing images found — this is a fresh deployment."
fi

# ---------------------------------------------------------------------------
# Step 3: Build and start new containers
# ---------------------------------------------------------------------------
echo ""
info "Step 3/5: Building images and starting containers..."

if ! docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build 2>&1; then
    fail "Docker Compose build/up failed!"
    fail "Initiating rollback..."
    rollback
    exit 1
fi

ok "Containers are starting"

# ---------------------------------------------------------------------------
# Step 4: Health check
# ---------------------------------------------------------------------------
echo ""
info "Step 4/5: Waiting for app to pass health check..."

health_check_ok=false
for i in $(seq 1 "$HEALTH_RETRIES"); do
    # Try the root URL as a basic health probe
    if curl -sf -o /dev/null "$HEALTH_URL" 2>/dev/null; then
        health_check_ok=true
        break
    fi
    sleep "$HEALTH_INTERVAL"
done

if [ "$health_check_ok" = true ]; then
    ok "Health check passed — app is responding at ${HEALTH_URL}"
else
    fail "Health check failed after ${HEALTH_RETRIES} attempts (${HEALTH_URL})"
    fail "Initiating rollback..."
    rollback
    exit 1
fi

# Additional check: verify the worker is running
if docker compose -f "$COMPOSE_FILE" ps worker 2>/dev/null | grep -q "Up"; then
    ok "Worker container is running"
else
    warn "Worker container is not in 'Up' state. Check logs:"
    warn "  docker compose -f ${COMPOSE_FILE} logs worker"
fi

# ---------------------------------------------------------------------------
# Step 5: Cleanup old images
# ---------------------------------------------------------------------------
echo ""
info "Step 5/5: Cleaning up old Docker images..."

docker image prune -f --filter "until=24h" 2>/dev/null || true

# Remove rollback tags older than 7 days
docker images --format '{{.Repository}}:{{.Tag}}' | grep 'hostamar-rollback-' \
    | while IFS= read -r img; do
        created_at=$(docker inspect --format '{{.Created}}' "$img" 2>/dev/null || echo "0")
        created_epoch=$(date -d "$created_at" +%s 2>/dev/null || echo 0)
        now_epoch=$(date +%s)
        age_days=$(( (now_epoch - created_epoch) / 86400 ))
        if [ "$age_days" -gt 7 ]; then
            docker rmi "$img" 2>/dev/null || true
        fi
    done

ok "Cleanup complete"

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ✅  Deployment completed successfully!                     ║"
echo "║                                                              ║"
echo "║  App:    ${HEALTH_URL}                         "
echo "║  Stack:  $(docker compose -f ${COMPOSE_FILE} ps --services | tr '\n' ' ')  "
echo "║  Time:   $(date '+%Y-%m-%d %H:%M:%S UTC')                    ║"
echo "╚══════════════════════════════════════════════════════════════╝"

