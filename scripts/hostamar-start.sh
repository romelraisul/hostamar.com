#!/bin/bash
# =============================================================================
# Hostamar Local VPS — Start Everything
# Run this to start the full production stack locally (no cloud VPS needed)
# =============================================================================

set -e

LOCAL_IP=$(hostname -I | awk '{print $1}')
DOCKER="/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe"
LOG_DIR="/home/romel/hostamar-logs"
TUNNEL_URL_FILE="/home/romel/hostamar-tunnel-url.txt"

info() { echo -e "\e[34m[INFO]\e[0m $*"; }
ok()   { echo -e "\e[32m[OK]\e[0m   $*"; }
err()  { echo -e "\e[31m[ERROR]\e[0m $*"; }

mkdir -p "$LOG_DIR"

info "=== Hostamar Local VPS Startup ==="
info "Date: $(date)"
info "Local IP: $LOCAL_IP"

# 1. Ensure Docker Desktop is running
info "Checking Docker..."
if "$DOCKER" info > /dev/null 2>&1; then
    ok "Docker is running"
else
    err "Docker Desktop not running. Please start Docker Desktop from Windows Start Menu"
    exit 1
fi

# 2. Start PostgreSQL + Redis + App
info "Starting production stack..."
cd /home/romel/hostamar-build
"$DOCKER" compose -f docker-compose.prod.yml up -d 2>/dev/null || \
    "$DOCKER" start hostamar-postgres hostamar-redis hostamar-app hostamar-nginx 2>/dev/null || true
sleep 3

# 3. Start nginx if not running
"$DOCKER" start hostamar-nginx 2>/dev/null || \
    "$DOCKER" run -d --name hostamar-nginx --network hostamar-build_default -p 80:80 hostamar-nginx:latest 2>/dev/null || true

sleep 2

# 4. Verify all services
for svc in hostamar-app hostamar-postgres hostamar-redis hostamar-nginx; do
    status=$("$DOCKER" inspect --format='{{.State.Status}}' "$svc" 2>/dev/null)
    if [ "$status" = "running" ]; then
        ok "Container $svc is $status"
    else
        err "Container $svc is $status"
    fi
done

# 5. Start Cloudflare Tunnel (public access)
info "Starting Cloudflare Tunnel... (free, no account needed)"
pkill -f "cloudflared tunnel --url" 2>/dev/null || true
nohup /usr/local/bin/cloudflared tunnel --url http://localhost:80 \
    > "$LOG_DIR/cloudflare-tunnel.log" 2>&1 &
TUNNEL_PID=$!
sleep 5

# 6. Capture tunnel URL
TUNNEL_URL=$(grep -oP 'https://[a-z-]+\.trycloudflare\.com' "$LOG_DIR/cloudflare-tunnel.log" 2>/dev/null | head -1)
if [ -n "$TUNNEL_URL" ]; then
    echo "$TUNNEL_URL" > "$TUNNEL_URL_FILE"
    ok "Tunnel URL: $TUNNEL_URL"
    ok "Saved to: $TUNNEL_URL_FILE"
    ok "Your local VPS is LIVE on the internet!"
else
    err "Tunnel URL not yet available. Check: $LOG_DIR/cloudflare-tunnel.log"
fi

# 7. Final health check
sleep 2
echo ""
info "=== Health Checks ==="
curl -s -o /dev/null -w "Local App (port 3000): HTTP %{http_code}\n" http://localhost:3000/ --max-time 5
curl -s -o /dev/null -w "Local Nginx (port 80): HTTP %{http_code}\n" http://localhost:80/ --max-time 5
if [ -n "$TUNNEL_URL" ]; then
    curl -s -o /dev/null -w "Tunnel (public):     HTTP %{http_code}\n" "$TUNNEL_URL/" --max-time 10
fi

echo ""
info "=== Hostamar Local VPS is RUNNING ==="
info "Local:  http://localhost:80  → nginx → Next.js"
info "Local:  http://localhost:3000 (direct)"
info "Public: $TUNNEL_URL"
info "DB:     postgresql://hostamar:***@localhost:5432/hostamar"
info "Redis:  redis://localhost:6379"
info "Ollama: http://localhost:11434 (qwen3.6, hermes3, granite4.1)"
TUNNEL_URL=$(grep -oP "https://[a-z-]+\.trycloudflare\.com" /home/romel/hostamar-logs/cloudflare-tunnel.log 2>/dev/null | head -1)
if [ -n "$TUNNEL_URL" ]; then
    echo "$TUNNEL_URL" > /home/romel/hostamar-tunnel-url.txt
    echo "Tunnel URL: $TUNNEL_URL"
fi
