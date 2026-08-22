#!/bin/bash
# hostamar-tunnel-supervisor.sh
# Keeps the hostamar.com cloudflared tunnel + hostamar-nginx container alive
# and ensures nginx can reach hostamar-app regardless of which Docker network
# the app runs on (network drift from container restarts composes).
# Lock file prevents overlap on rapid cron ticks.
# Exit 0 = runnable healthy.
set -euo pipefail

LOCK=/tmp/hostamar-tunnel.lock
[ -e "$LOCK" ] && kill -0 "$(cat "$LOCK" 2>/dev/null)" 2>/dev/null || rm -f "$LOCK"
exec 9>"$LOCK"
flock -n 9 || { echo "[$(date +%H:%M:%S)] tunnel supervisor already running"; exit 0; }

LOG=/home/romel/.hermes/cron/output/tunnel-supervisor.log
mkdir -p "$(dirname "$LOG")"
export DOCKER_HOST=unix:///mnt/wsl/docker-desktop-bind-mounts/Ubuntu/docker.sock

# 1. nginx container must exist and bridge to the SAME network hostamar-app lives on
APP_NET=$(docker inspect hostamar-app -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' 2>/dev/null | head -1 | awk '{print $1}')
if [ -z "$APP_NET" ]; then
  echo "[$(date +%H:%M:%S)] hostamar-app MISSING — cannot repair nginx" >>"$LOG"
  exit 1
fi
NGINX_OK=$(docker inspect -f '{{.State.Running}}' hostamar-nginx 2>/dev/null || echo "false")
if [ "$NGINX_OK" != "true" ]; then
  echo "[$(date +%H:%M:%S)] nginx DOWN — restarting on ${APP_NET}" >>"$LOG"
  docker rm -f hostamar-nginx >/dev/null 2>&1 || true
  docker run -d --name hostamar-nginx \
    --restart unless-stopped \
    --network "$APP_NET" \
    --network hostamar-build_default \
    --network-alias hostamar-nginx \
    -p 80:80 \
    hostamar-nginx:local >>"$LOG" 2>&1
  sleep 2
fi
# 1b. Always reconnect nginx to whatever network(s) the app is on (drift-proof)
NGINX_NOW_NETS=$(docker inspect hostamar-nginx -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' 2>/dev/null)
if echo "$NGINX_NOW_NETS" | grep -qv "$APP_NET"; then
  echo "[$(date +%H:%M:%S)] nginx not on ${APP_NET} — reconnecting" >>"$LOG"
  docker network connect "$APP_NET" hostamar-nginx 2>/dev/null || true
fi

# 2. cloudflared must be running
if ! pgrep -f "cloudflared tunnel run" >/dev/null; then
  echo "[$(date +%H:%M:%S)] cloudflared DOWN — restarting" >>"$LOG"
  pkill -f "cloudflared tunnel" 2>/dev/null || true
  sleep 1
  cd /mnt/c/Users/User/hostamar-build
  nohup cloudflared tunnel run >>"$LOG" 2>&1 &
  disown
fi

# 2b. LiteLLM router container (port 4000) — restart if dead
LITELLM_OK=$(docker inspect -f '{{.State.Running}}' litellm-play 2>/dev/null || echo "false")
if [ "$LITELLM_OK" != "true" ]; then
  echo "[$(date +%H:%M:%S)] litellm-play DOWN — restarting" >>"$LOG"
  docker start litellm-play >/dev/null 2>&1 || true
fi

# 2c. Ollama daemon (WSL host, not Docker) — restart if port closed
if ! curl -s --max-time 3 http://localhost:11434/api/tags >/dev/null 2>&1; then
  if ! pgrep -f "ollama serve" >/dev/null 2>&1; then
    echo "[$(date +%H:%M:%S)] ollama DOWN — restarting in background" >>"$LOG"
    nohup ollama serve >>"$LOG" 2>&1 &
    disown
  fi
fi

# 3. Quick public health probe — log result
HTTP=$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 https://hostamar.com/api/health 2>/dev/null)
if [ "$HTTP" = "200" ]; then
  echo "[$(date +%H:%M:%S)] hostamar.com 200 OK" >>"$LOG"
else
  echo "[$(date +%H:%M:%S)] hostamar.com HTTP=$HTTP — may need manual check" >>"$LOG"
fi

exit 0
