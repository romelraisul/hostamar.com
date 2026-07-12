#!/bin/bash
# ============================================================================
# scripts/rotate-turn-cert.sh — renew Let's Encrypt certs for the TURN domain
# and hot-restart coturn + livekit so voice survives cert expiry. $0 (no paid
# LB). Called by the certbot renew hook or a daily cron.
#
# Usage:
#   ./scripts/rotate-turn-cert.sh            # live: copy LE certs, restart
#   ./scripts/rotate-turn-cert.sh --dry-run  # validate paths, no restart
# ============================================================================
set -euo pipefail

DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

DOMAIN="${TURN_DOMAIN:-turn.hostamar.com}"
CERT_DIR="${CERT_DIR:-certs}"
LE_DIR="/etc/letsencrypt/live/$DOMAIN"
COMPOSE="docker-compose.prod.yml"
CRON_SECRET="${CRON_SECRET:-}"

echo "==> TURN cert rotation for $DOMAIN (dry_run=$DRY_RUN)"

if [ ! -f "$LE_DIR/fullchain.pem" ]; then
  echo "LE cert not found at $LE_DIR — run 'certbot certonly -d $DOMAIN' first."
  [ "$DRY_RUN" -eq 1 ] && echo "(dry-run: continuing to validate script logic)" || exit 0
fi

# Ensure local cert dir exists
mkdir -p "$CERT_DIR"

if [ "$DRY_RUN" -eq 1 ]; then
  echo "[dry-run] would copy $LE_DIR/fullchain.pem -> $CERT_DIR/fullchain.pem"
  echo "[dry-run] would copy $LE_DIR/privkey.pem   -> $CERT_DIR/privkey.pem"
  echo "[dry-run] would restart: docker compose -f $COMPOSE restart coturn livekit"
  # Validate merged compose config (prod override + base) instead of touching live containers.
  docker compose -f docker-compose.yml -f "$COMPOSE" config >/dev/null && echo "[dry-run] merged compose config OK"
  exit 0
fi

# Copy fresh certs (privkey must stay 600)
cp "$LE_DIR/fullchain.pem" "$CERT_DIR/fullchain.pem"
cp "$LE_DIR/privkey.pem"   "$CERT_DIR/privkey.pem"
chmod 600 "$CERT_DIR/privkey.pem"

# Hot-restart the voice stack (unless-stopped containers come back automatically)
docker compose -f "$COMPOSE" restart coturn livekit || docker restart hostamar-coturn hostamar-livekit
sleep 5

# Verify livekit came back up
if curl -fsS http://localhost:7880/ >/dev/null; then
  echo "livekit ok"
else
  echo "livekit check failed" >&2
fi

# Notify the internal support endpoint so the status page records the rotation.
if [ -n "$CRON_SECRET" ]; then
  curl -fsS -X POST http://localhost:3000/api/admin/support/fix \
    -H "Content-Type: application/json" \
    -H "X-Internal-Secret: $CRON_SECRET" \
    -d '{"service":"coturn","action":"cert-rotated","result":"ok"}' || true
fi

echo "==> TURN cert rotation complete"
