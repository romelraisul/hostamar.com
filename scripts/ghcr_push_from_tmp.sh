#!/usr/bin/env bash
set -euo pipefail

IMAGE_BASE="ghcr.io/romelraisul/hostamar-app"
ENV_FILE="/home/romel/hostamar-build/.env.docker"
PAT_FILE="/tmp/ghcr_pat.txt"

PUSH=false
RC=""

while [ $# -gt 0 ]; do
  case "$1" in
    --push) PUSH=true; shift ;;
    --no-push) PUSH=false; shift ;;
    --rc) RC="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 2 ;;
  esac
done

if [ -n "$RC" ]; then
  if ! [[ "$RC" =~ ^[0-9]+$ ]]; then
    echo "Invalid rc value: '$RC'. Must be a positive integer." >&2
    exit 1
  fi
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 2
fi

if [ ! -r "$ENV_FILE" ]; then
  echo "Env file not readable: $ENV_FILE" >&2
  exit 2
fi

if [ "$PUSH" = true ] && [ ! -f "$PAT_FILE" ]; then
  echo "PAT file not found: $PAT_FILE. Create it with your GHCR PAT and set mode 600." >&2
  exit 3
fi

if [ "$PUSH" = true ]; then
  PERM=$(stat -c "%a" "$PAT_FILE")
  if [ "$PERM" != "600" ]; then
    echo "Warning: $PAT_FILE permissions are $PERM; setting to 600."
    chmod 600 "$PAT_FILE"
  fi
fi

NEXTAUTH_SECRET=$(grep '^NEXTAUTH_SECRET=' "$ENV_FILE" | cut -d'=' -f2- || true)
if [ -z "$NEXTAUTH_SECRET" ]; then
  echo "NEXTAUTH_SECRET not found in $ENV_FILE" >&2
  exit 4
fi

SHORT_SHA=$(git rev-parse --short=8 HEAD)
DATE_TAG=$(date -u +%Y%m%d)
SEM_TAG="v${DATE_TAG}-${SHORT_SHA}"
if [ -n "$RC" ]; then
  SEM_TAG="${SEM_TAG}-rc${RC}"
fi
SHORT_TAG="sha-${SHORT_SHA}"

echo "Building image tags:"
echo "  ${IMAGE_BASE}:${SEM_TAG}"
echo "  ${IMAGE_BASE}:${SHORT_TAG}"
echo "  ${IMAGE_BASE}:latest"

docker buildx build --platform linux/amd64,linux/arm64 \
  --build-arg NEXTAUTH_URL="https://hostamar.com" \
  --build-arg NEXTAUTH_SECRET="${NEXTAUTH_SECRET}" \
  -t "${IMAGE_BASE}:${SEM_TAG}" \
  -t "${IMAGE_BASE}:${SHORT_TAG}" \
  -t "${IMAGE_BASE}:latest" \
  .

if [ "$PUSH" = true ]; then
  echo "Logging into GHCR..."
  GHCR_PAT=$(cat "$PAT_FILE")
  if [ -z "$GHCR_PAT" ]; then
    echo "GHCR PAT file is empty" >&2
    exit 5
  fi
  echo "$GHCR_PAT" | docker login ghcr.io -u "${GHCR_USER:-romelraisul}" --password-stdin

  echo "Pushing images..."
  docker push "${IMAGE_BASE}:${SEM_TAG}"
  docker push "${IMAGE_BASE}:${SHORT_TAG}"
  docker push "${IMAGE_BASE}:latest"
fi

echo "Recording image digest (best-effort)..."
DIGEST=$(docker inspect --format='{{index .RepoDigests 0}}' "${IMAGE_BASE}:${SEM_TAG}" 2>/dev/null || true)
if [ -n "$DIGEST" ]; then
  echo "$DIGEST" > image-digest.txt
  echo "Saved image digest to image-digest.txt: $DIGEST"
else
  echo "Could not determine RepoDigest locally; check GHCR UI for digest."
fi

echo "Running smoke test: ops/nextauth_tunnel_check.sh (production)"
HEALTH_URL=${HEALTH_URL:-https://hostamar.com/api/health}
export HEALTH_URL
if [ -f "ops/nextauth_tunnel_check.sh" ]; then
  chmod +x ops/nextauth_tunnel_check.sh
  ops/nextauth_tunnel_check.sh
else
  echo "Warning: ops/nextauth_tunnel_check.sh not found, skipping smoke test."
fi

echo "Build/push/verify sequence completed successfully for ${IMAGE_BASE}:${SEM_TAG}"
