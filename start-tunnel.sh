#!/usr/bin/env bash
# start-tunnel.sh — bring up cloudflared tunnel (idempotent, safe at boot).
# Invoked by permanent.sh and by the */2 supervisor if cloudflared is dead.
set -uo pipefail

LOG=/home/romel/hostamar-build/logs/cloudflared.log
mkdir -p "$(dirname "$LOG")"

#already running? nothing to do
if pgrep -f "cloudflared tunnel" >/dev/null 2>&1; then
  echo "[$(date -u +%FT%TZ)] cloudflared already running — skip" >>"$LOG"
  exit 0
fi

#don't re-login; use existing credentials (memory rule)
cd /home/romel/hostamar-build

# Launch background
nohup cloudflared tunnel --config /home/romel/.cloudflared/config.yml run \
  >"$LOG" 2>&1 &
disown

#Wait up to 15s for tunnel to register
for i in $(seq 1 15); do
  sleep 1
  if grep -qiE "Registered tunnel connection|Tunnel is now active" "$LOG"; then
    echo "[$(date -u +%FT%TZ)] tunnel UP after ${i}s" >>"$LOG"
    exit 0
  fi
done
echo "[$(date -u +%FT%TZ)] tunnel not confirmed after 15s — check $LOG" >>"$LOG"
exit 0
