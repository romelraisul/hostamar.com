#!/bin/bash
# ============================================================================
# scripts/render-turn-conf.sh — render infra/coturn/turnserver.conf from .env.
#
# coturn does NOT expand ${VAR} placeholders, so we substitute them at deploy
# time from the environment. Idempotent: re-running overwrites the mounted
# file the coturn container reads.
#
# Usage:  source .env && ./scripts/render-turn-conf.sh
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONF_SRC="$ROOT/infra/coturn/turnserver.conf"
CONF_OUT="${TURN_CONF_OUT:-$ROOT/infra/coturn/turnserver.rendered.conf}"

: "${TURN_STATIC_AUTH_SECRET:?set TURN_STATIC_AUTH_SECRET in env}"
: "${VPS_PUBLIC_IP:?set VPS_PUBLIC_IP in env (curl -s ifconfig.me)}"
TURN_DOMAIN="${LIVEKIT_TURN_DOMAIN:-turn.hostamar.com}"
PRIVATE_IP="$(hostname -I | awk '{print $1}')"

echo "Rendering coturn conf: domain=$TURN_DOMAIN public=$VPS_PUBLIC_IP private=$PRIVATE_IP"
env \
  TURN_STATIC_AUTH_SECRET="$TURN_STATIC_AUTH_SECRET" \
  PUBLIC_IP="$VPS_PUBLIC_IP" \
  TURN_DOMAIN="$TURN_DOMAIN" \
  PRIVATE_IP="$PRIVATE_IP" \
  envsubst '${TURN_STATIC_AUTH_SECRET} ${PUBLIC_IP} ${TURN_DOMAIN} ${PRIVATE_IP}' \
  < "$CONF_SRC" > "$CONF_OUT"

echo "Wrote $CONF_OUT"
echo "Run: docker compose -f docker-compose.prod.yml up -d coturn livekit"
