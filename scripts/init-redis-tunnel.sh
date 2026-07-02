#!/usr/bin/env bash
# scripts/init-redis-tunnel.sh
#
# Creates the Cloudflare tunnel for the Redis bridge, wires DNS, and
# updates the running cloudflared container. Requires these env vars
# (attached credentials, never paste in chat):
#
#   CF_API_TOKEN    — Zone:DNS:Edit + Account:Cloudflare Tunnel:Edit
#   CF_ACCOUNT_ID   — hex from CF dashboard URL
#   CF_ZONE_ID      — hex, the hostamar.com zone
#   TUNNEL_NAME     — defaults to "hostamar-redis-bridge"
#
# Outputs:
#   - ~/.cloudflared/<TUNNEL_ID>.json (credential file)
#   - DNS CNAME: redis.hostamar.com → <TUNNEL_ID>.cfargotunnel.com
#   - Updates hostamar-cloudflared container with new credentials
#
# STATUS: NOT YET RUN. Will fail without attached creds.

set -euo pipefail

: "${CF_API_TOKEN:?not set}"
: "${CF_ACCOUNT_ID:?not set}"
: "${CF_ZONE_ID:?not set}"
TUNNEL_NAME="${TUNNEL_NAME:-hostamar-redis-bridge}"

echo "[1/5] Creating tunnel identity $TUNNEL_NAME..."
cloudflared tunnel create "$TUNNEL_NAME" \
  --cred-file "/root/.cloudflared/${TUNNEL_NAME,,}.json"

TUNNEL_ID=$(cloudflared tunnel list --output json | \
  jq -r ".[] | select(.name == \"$TUNNEL_NAME\") | .id")
echo "Tunnel ID: $TUNNEL_ID"

echo "[2/5] Writing per-tunnel config..."
cat > "/etc/cloudflared/services/${TUNNEL_NAME,,}.yml" <<EOF
tunnel: $TUNNEL_ID
credentials-file: /etc/cloudflared/${TUNNEL_NAME,,}.json
ingress:
  - hostname: redis.hostamar.com
    service: http://hostamar-redis-bridge:6380
    originRequest:
      keepAliveConnections: 4
      keepAliveTimeout: 90s
      noTLSVerify: true
  - service: http_status:404
EOF

echo "[3/5] Adding DNS CNAME via Cloudflare API..."
curl -sS -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data "{\"type\":\"CNAME\",\"name\":\"redis\",\"content\":\"${TUNNEL_ID}.cfargotunnel.com\",\"proxied\":true}"

echo "[4/5] Restarting cloudflared container..."
docker restart hostamar-cloudflared

echo "[5/5] Verifying connectivity..."
sleep 10
curl -sS https://redis.hostamar.com -o /dev/null -w "redis.hostamar.com: HTTP %{http_code}\n"

echo "Done."
