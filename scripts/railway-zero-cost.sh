#!/usr/bin/env bash
# =============================================================================
# railway-zero-cost.sh — keep Railway at $0 when your computer is the primary.
#
# Runs on computer boot + every 5 min via cron. When the primary tunnel is
# healthy it PAUSES the Railway service (so it receives 0 requests => ~$0).
# When the computer is down it UNPAUSES Railway so the Cloudflare Worker can
# fail over. Requires RAILWAY_API_TOKEN + SERVICE_ID set in the environment
# (or inline below). Reads PRIMARY health via the api-primary tunnel hostname.
#
# Usage:  railway-zero-cost.sh   (designed for cron: */5 * * * *)
# =============================================================================
set -euo pipefail

# --- Config (prefer env, fallback to inline placeholders) -------------------
RAILWAY_TOKEN="${RAILWAY_API_TOKEN:-CHANGEME_RAILWAY_TOKEN}"
SERVICE_ID="${RAILWAY_SERVICE_ID:-CHANGEME_SERVICE_ID}"
PRIMARY_HEALTH_URL="${PRIMARY_HEALTH_URL:-https://api-primary.hostamar.com/api/health}"

GRAPHQL="https://backboard.railway.app/graphql/v2"

pause() {
  echo "[$(date -u +%FT%TZ)] Primary UP -> Pausing Railway (cost = 0)"
  curl -s -X POST "$GRAPHQL" \
    -H "Authorization: Bearer $RAILWAY_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"query\":\"mutation servicePause(\$id:String!){servicePause(id:\$id)}\",\"variables\":{\"id\":\"$SERVICE_ID\"}}" \
    >/dev/null || echo "pause call failed"
}

unpause() {
  echo "[$(date -u +%FT%TZ)] Primary DOWN -> Unpausing Railway (failover)"
  curl -s -X POST "$GRAPHQL" \
    -H "Authorization: Bearer $RAILWAY_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"query\":\"mutation serviceUnpause(\$id:String!){serviceUnpause(id:\$id)}\",\"variables\":{\"id\":\"$SERVICE_ID\"}}" \
    >/dev/null || echo "unpause call failed"
}

if curl -s --max-time 2 "$PRIMARY_HEALTH_URL" | grep -qi '"ok"\|200\|healthy'; then
  pause
else
  unpause
fi
