#!/usr/bin/env bash
set -euo pipefail

# ops/cloudflared/deploy_staging.sh
# Usage:
#   ./ops/cloudflared/deploy_staging.sh
#   ./ops/cloudflared/deploy_staging.sh --compose-file ./ops/cloudflared/docker-compose.cloudflared.yml --cred /home/romel/.cloudflared/tunnel-config/credentials.json --cred-uid 1000 --cred-gid 1000 --staging-url https://staging.hostamar.com/api/health

COMPOSE_FILE="${COMPOSE_FILE:-./ops/cloudflared/docker-compose.cloudflared.yml}"
CREDENTIAL_PATH="${CREDENTIAL_PATH:-/home/romel/.cloudflared/tunnel-config/credentials.json}"
CRED_UID="${CRED_UID:-1000}"
CRED_GID="${CRED_GID:-1000}"
STAGING_URL="${STAGING_URL:-https://staging.hostamar.com/api/health}"
CONTAINER_NAME="${CONTAINER_NAME:-cloudflared}"
HEALTH_ENDPOINT_LOCAL="http://127.0.0.1:8080/ready"
WAIT_SECS="${WAIT_SECS:-5}"
MAX_RETRIES="${MAX_RETRIES:-12}" # ~6 minutes

# parse args (simple)
while [ $# -gt 0 ]; do
  case "$1" in
    --compose-file) COMPOSE_FILE="$2"; shift 2 ;;
    --cred) CREDENTIAL_PATH="$2"; shift 2 ;;
    --cred-uid) CRED_UID="$2"; shift 2 ;;
    --cred-gid) CRED_GID="$2"; shift 2 ;;
    --staging-url) STAGING_URL="$2"; shift 2 ;;
    --container) CONTAINER_NAME="$2"; shift 2 ;;
    --help) sed -n '1,120p' "$0"; exit 0 ;;
    *) echo "Unknown arg: $1"; exit 2 ;;
  esac
done

echo "Staging deploy script starting: $(date)"
echo "Compose: $COMPOSE_FILE"
echo "Credentials: $CREDENTIAL_PATH"
echo "Container credential UID:GID: ${CRED_UID}:${CRED_GID}"
echo "Staging health URL: $STAGING_URL"

# Preconditions
if [ ! -f "$COMPOSE_FILE" ]; then
  echo "ERROR: compose file not found: $COMPOSE_FILE" >&2
  exit 3
fi

if [ ! -f "$CREDENTIAL_PATH" ]; then
  echo "ERROR: credentials file not found: $CREDENTIAL_PATH" >&2
  exit 4
fi

# Ensure ownership and permissions
echo "Setting ownership and permissions on credentials"
sudo chown "${CRED_UID}:${CRED_GID}" "$CREDENTIAL_PATH"
sudo chmod 600 "$CREDENTIAL_PATH"

# Start compose
echo "Starting cloudflared via docker compose"
DOCKER_HOST= docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

# Wait for container to appear
echo "Waiting for container ${CONTAINER_NAME} to start..."
n=0
while ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; do
  n=$((n+1))
  if [ "$n" -ge 10 ]; then
    echo "ERROR: container ${CONTAINER_NAME} did not start in time" >&2
    docker compose -f "$COMPOSE_FILE" ps
    exit 5
  fi
  sleep 1
done

# Wait for container health (if present) or local ready endpoint
echo "Waiting for container health or local ready endpoint..."
retries=0
while true; do
  # prefer Docker health status if available
  HEALTH_JSON=$(docker inspect --format='{{json .State.Health}}' "${CONTAINER_NAME}" 2>/dev/null || true)
  if [ -n "$HEALTH_JSON" ] && [ "$HEALTH_JSON" != "null" ]; then
    STATUS=$(echo "$HEALTH_JSON" | awk -F'"' '/"Status":/ {print $4; exit}')
    echo "Docker health status: ${STATUS}"
    if [ "$STATUS" = "healthy" ]; then
      break
    fi
  else
    # fallback to local ready endpoint inside container
    if docker exec "${CONTAINER_NAME}" sh -c "curl -fsS --max-time 3 ${HEALTH_ENDPOINT_LOCAL} >/dev/null" >/dev/null 2>&1; then
      echo "Local ready endpoint responded"
      break
    fi
    echo "No Docker health or ready endpoint yet"
  fi

  retries=$((retries+1))
  if [ "$retries" -ge "$MAX_RETRIES" ]; then
    echo "ERROR: health check timed out after $((MAX_RETRIES * WAIT_SECS)) seconds" >&2
    echo "Container logs (last 200 lines):"
    docker logs --tail 200 "${CONTAINER_NAME}" || true
    exit 6
  fi
  sleep "$WAIT_SECS"
done

# Verify public staging health endpoint
echo "Verifying public staging health endpoint: $STAGING_URL"
if curl -fsS --max-time 10 "$STAGING_URL" | jq . >/dev/null 2>&1; then
  echo "Staging health endpoint returned valid JSON"
  curl -fsS "$STAGING_URL" | jq .
  echo "Staging deploy and smoke test succeeded"
  exit 0
else
  echo "ERROR: staging health endpoint failed or returned invalid JSON" >&2
  echo "Container logs (last 500 lines):"
  docker logs --tail 500 "${CONTAINER_NAME}" || true
  exit 7
fi
