#!/bin/bash
# Cloudflare Tunnel Token Rotation Script
# Run this to rotate the exposed token

set -e

echo "=== Cloudflare Tunnel Token Rotation ==="
echo ""
echo "1. Go to Cloudflare Dashboard:"
echo "   https://dash.cloudflare.com"
echo "   → My Profile → API Tokens → Create Token"
echo ""
echo "2. Token permissions:"
echo "   - Zone → Zone → Read"
echo "   - Zone → DNS → Edit"
echo "   - Account → Cloudflare Tunnel → Edit"
echo ""
echo "3. Copy the NEW token and run:"
echo ""
echo "   # Update docker-compose environment"
echo "   sed -i 's|CLOUDFLARE_TUNNEL_TOKEN=.*|CLOUDFLARE_TUNNEL_TOKEN=<NEW_TOKEN>|' /mnt/c/Users/romel/hostamar-local/.env"
echo "   sed -i 's|CLOUDFLARE_TUNNEL_TOKEN=.*|CLOUDFLARE_TUNNEL_TOKEN=<NEW_TOKEN>|' /mnt/c/Users/romel/hostamar-local/flociops-assistant/.env"
echo ""
echo "4. Restart cloudflared:"
echo "   docker compose -f /mnt/c/Users/romel/hostamar-local/docker-compose.yml restart cloudflared"
echo ""
echo "5. Verify staging:"
echo "   curl -s -o /dev/null -w '%{http_code}' https://staging.hostamar.com"
echo "   # Should return 200"
echo ""
echo "=== Current exposed token (ROTATE IMMEDIATELY): ==="
echo "REDACTED"