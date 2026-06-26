#!/usr/bin/env bash
# =============================================================================
# Hostamar — One-command setup container runner
# =============================================================================
# Usage:
#   ./run-setup-container.sh [--deploy-dir /path] [--repo url] [--branch branch]
#
# Example:
#   ./run-setup-container.sh \
#     --deploy-dir /opt/hostamar \
#     --repo https://github.com/monjilaktn/hostamar.git \
#     --branch main \
#     -e DATABASE_URL=... \
#     -e NEXTAUTH_SECRET=... \
#     -e NEXTAUTH_URL=https://hostamar.com
#
# Required env vars (or pass them with -e):
#   DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IMAGE_NAME="hostamar/setup:latest"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/hostamar}"
DOCKER_SOCK="${DOCKER_SOCK:-/var/run/docker.sock}"

info() { echo -e "\033[0;34m[INFO]\033[0m $*"; }
ok()   { echo -e "\033[0;32m[OK]\033[0m $*"; }

# Parse args
POSITIONAL=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --deploy-dir) DEPLOY_DIR="$2"; shift 2 ;;
    --repo)       REPO_URL="$2"; shift 2 ;;
    --branch)     BRANCH="$2"; shift 2 ;;
    -e)           ENV_ARGS+=("-e $2"); shift 2 ;;
    *)            POSITIONAL+=("$1"); shift ;;
  esac
done
set -- "${POSITIONAL[@]}"

REPO_URL="${REPO_URL:-https://github.com/monjilaktn/hostamar.git}"
BRANCH="${BRANCH:-main}"

info "Image:     ${IMAGE_NAME}"
info "Repo:      ${REPO_URL} (${BRANCH})"
info "Deploy:    ${DEPLOY_DIR}"
info "Socket:    ${DOCKER_SOCK}"

if [[ ! -S "$DOCKER_SOCK" ]]; then
    err "Docker socket not found at ${DOCKER_SOCK}. Is Docker running on this host?"
    exit 1
fi

mkdir -p "$(dirname "$DEPLOY_DIR")"

docker run --rm \
  -v "$DOCKER_SOCK":"$DOCKER_SOCK" \
  -v "$DEPLOY_DIR":"$DEPLOY_DIR" \
  -e DEPLOY_DIR="$DEPLOY_DIR" \
  -e REPO_URL="$REPO_URL" \
  -e BRANCH="$BRANCH" \
  -e DOCKER_HOST="unix://${DOCKER_SOCK}" \
  "${ENV_ARGS[@]}" \
  "$IMAGE_NAME"

ok "Setup container finished."
