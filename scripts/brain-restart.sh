#!/bin/bash
# brain-restart.sh — V74 canonical Brain (:4000 litellm-play) restart.
# Cloud free tiers only — NO ollama dependency (V74: ollama off by default).
# Loads keys from .env.docker + .env.providers (never printed).
set -uo pipefail
BUILD="/home/romel/hostamar-build"
cd "$BUILD"
set -a; . ./.env.docker 2>/dev/null; . ./.env.providers 2>/dev/null; set +a
docker rm -f litellm-play >/dev/null 2>&1
docker run -d \
  --name litellm-play \
  --restart unless-stopped \
  -p 4000:4000 \
  -v "$BUILD/litellm-config.final.yaml:/tmp/cfg.yaml:ro" \
  -v "$BUILD/guard:/tmp/guard:ro" \
  -v "$BUILD/state/guard_history.db:/tmp/guard_history.db" \
  -e PYTHONPATH=/tmp/guard:/tmp \
  -e NVIDIA_API_KEY="${NVIDIA_API_KEY:-}" \
  -e KILOCODE_API_KEY="${KILOCODE_API_KEY:-}" \
  -e KILOCODE_BASE_URL="${KILOCODE_BASE_URL:-https://api.kilo.ai/api/gateway}" \
  -e BAI_API_KEY="${BAI_API_KEY:-}" \
  -e ORCA_API_KEY="${ORCA_API_KEY:-}" \
  -e TOKENROUTER_API_KEY="${TOKENROUTER_API_KEY:-}" \
  -e TG_DB=/tmp/guard_history.db \
  -e TG_ARCHIVE_PATH=/tmp/guard_archive.jsonl \
  --add-host host.docker.internal:host-gateway \
  --entrypoint /bin/bash \
  ghcr.io/berriai/litellm:main-latest \
  /tmp/guard/entrypoint-litellm.sh
echo "litellm-play restarted — waiting for :4000"
for i in $(seq 1 20); do
  code=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 4 http://localhost:4000/v1/models 2>/dev/null)
  [ "$code" = "200" ] && { echo "Brain UP (HTTP 200)"; exit 0; }
  sleep 3
done
echo "Brain did not come up in 60s — check: docker logs litellm-play" >&2
exit 1
