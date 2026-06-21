#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# deploy-full.sh — build → push → deploy → verify (single command)
#
# Usage:
#   bash scripts/deploy-full.sh                    # build + push only
#   bash scripts/deploy-full.sh --deploy           # build + push + deploy to prod
#   bash scripts/deploy-full.sh --rollback TAG     # rollback app to <tag>
#
# Requires: GHCR_PAT env var, SSH key for prod host
# ---------------------------------------------------------------------------
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SCRIPT_DIR"

GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "local")
IMAGE_NAME="ghcr.io/romelraisul/hostamar-app"
IMAGE_TAG="release-${GIT_SHA}"
IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"

# Production SSH config (override with env vars)
PROD_HOST="${PROD_HOST:-}"
PROD_USER="${PROD_USER:-root}"
PROD_SSH_KEY="${PROD_SSH_KEY:-$HOME/.ssh/prod_key}"
PROD_DIR="${PROD_DIR:-/home/romel/hostamar.com}"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

# --- Rollback ---
if [ "${1:-}" = "--rollback" ]; then
  TAG="${2:-}"
  if [ -z "$TAG" ]; then
    echo "Usage: $0 --rollback <image-tag>"
    exit 1
  fi
  log "Rolling back to ${IMAGE_NAME}:${TAG} on ${PROD_HOST}..."
  ssh -i "$PROD_SSH_KEY" "${PROD_USER}@${PROD_HOST}" "
    cd ${PROD_DIR}
    docker pull ${IMAGE_NAME}:${TAG}
    docker tag ${IMAGE_NAME}:${TAG} ${IMAGE_NAME}:latest
    docker compose up -d --no-deps --force-recreate app
    bash scripts/post-deploy-checks.sh
  "
  log "Rollback complete."
  exit 0
fi

DEPLOY=false
[ "${1:-}" = "--deploy" ] && DEPLOY=true

# --- 1. Build ---
log "=== Step 1: Build ==="
log "Building ${IMAGE}..."
docker build --build-arg DATABASE_URL="${DATABASE_URL:-}" \
  -t "$IMAGE" -t "${IMAGE_NAME}:latest" .
log "Build complete."

# --- 2. Push ---
log "=== Step 2: Push ==="
if [ -z "${GHCR_PAT:-}" ]; then
  log "⚠️  GHCR_PAT not set — skipping push. Set it to push to GitHub Container Registry."
else
  echo "$GHCR_PAT" | docker login ghcr.io -u romelraisul --password-stdin
  docker push "$IMAGE"
  docker push "${IMAGE_NAME}:latest"
  log "Push complete."
fi

if ! $DEPLOY; then
  log ""
  log "=== Build + push done. Run with --deploy to deploy to production. ==="
  log "  bash $0 --deploy"
  exit 0
fi

# --- 3. Deploy ---
log "=== Step 3: Deploy to ${PROD_HOST} ==="

if [ -z "$PROD_HOST" ]; then
  log "❌ PROD_HOST not set — skipping deploy."
  log "Set PROD_HOST, PROD_USER, PROD_SSH_KEY env vars."
  exit 1
fi

# Confirm
read -rp "Deploy ${IMAGE} to ${PROD_HOST}? (y/N) " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  log "Deploy cancelled."
  exit 0
fi

ssh -i "$PROD_SSH_KEY" "${PROD_USER}@${PROD_HOST}" "
  set -e
  cd ${PROD_DIR}
  git fetch origin main
  git checkout main
  git pull origin main
  docker compose pull
  docker compose up -d --remove-orphans
  docker image prune -f
  echo '--- Post-deploy checks ---'
  bash scripts/post-deploy-checks.sh
"

log ""
log "=== Deploy complete ==="
log "Image: ${IMAGE}"
log "Host:  ${PROD_HOST}"
log "Run post-deploy checks remote:"
log "  ssh -i ${PROD_SSH_KEY} ${PROD_USER}@${PROD_HOST} 'bash ${PROD_DIR}/scripts/post-deploy-checks.sh'"
