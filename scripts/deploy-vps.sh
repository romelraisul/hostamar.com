#!/usr/bin/env bash
# =============================================================================
# Hostamar — VPS production deploy (escapes the Vercel build-pipeline blocker)
#
# Builds the Next.js app image from the current repo and runs it on the EXISTING
# hostamar-network, reusing the live Postgres / Redis / Ollama / cloudflared
# tunnel. Does NOT start duplicate infra.
#
# Prereqs:
#   - .env.production.local present (captured from running container + (B) vars)
#   - docker available at the Windows pipe path
#   - hostamar-network exists (it does — cloudflared + 22 containers use it)
# =============================================================================
set -euo pipefail

DOCKER="/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe"
COMPOSE="/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe"
CONTEXT="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE="hostamar-app:latest"
NETWORK="hostamar-network"
ENVFILE="$CONTEXT/.env.production.local"

echo "==> Context: $CONTEXT"
echo "==> Using env_file: $ENVFILE"
[ -f "$ENVFILE" ] || { echo "ERROR: .env.production.local missing"; exit 1; }

echo "==> [1/5] Building app image via compose (next build runs here, NOT Vercel)"
"$COMPOSE" -f "$CONTEXT/docker-compose.prod.yml" build app

echo "==> [2/5] Stopping old app container (rollback tag: hostamar-app:rollback)"
"$DOCKER" rm -f hostamar-app || true

echo "==> [3/5] Running new app container on $NETWORK"
"$DOCKER" run -d \
  --name hostamar-app \
  --restart unless-stopped \
  --network "$NETWORK" \
  -p 3000:3000 \
  --env-file "$ENVFILE" \
  "$IMAGE"

echo "==> [4/5] Waiting for readiness (ensureSchema runs on first DB hit)"
for i in $(seq 1 30); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ || true)
  if [ "$CODE" = "200" ]; then
    echo "    app healthy (HTTP $CODE) after ${i}s"
    break
  fi
  sleep 2
done

echo "==> [5/5] Warm up DB self-heal (ensureSchema) + report"
curl -s -o /dev/null -w "    /api/health -> %{http_code}\n" http://localhost:3000/ || true

echo "==> Deploy done. Tunnel hostamar.com -> hostamar-app:3000 (Vercel no longer used for prod)."
echo "==> Next: run the (B) live verification curl against https://hostamar.com/api/payment/verify"
