#!/bin/bash
# cloudflared supervisor — keeps hostamar-prod cloudflared alive on WSL
# Runs every 2 minutes via cron supervisor.

LOCK=/tmp/cloudflared_supervisor.lock
LOG=/home/romel/hostamar-logs/cloudflared-supervisor.log
mkdir -p /home/romel/hostamar-logs

[ -f "$LOCK" ] && exit 0
echo $$ > "$LOCK"
trap 'rm -f "$LOCK"' EXIT

if pgrep -f "cloudflared tunnel --config" >/dev/null 2>&1; then
  exit 0
fi

echo "[supervisor] cloudflared not running, restarting at $(date '+%F %T')" >> "$LOG"
nohup cloudflared tunnel --config /home/romel/.cloudflared/config.yml run \
  >> /home/romel/hostamar-logs/cloudflared.log 2>&1 &
NEW=$!
disown
echo "[supervisor] started pid=$NEW" >> "$LOG"

# Give it 10s to fail fast if config is wrong, log result
sleep 10
if kill -0 "$NEW" 2>/dev/null; then
  echo "[supervisor] OK pid=$NEW alive after 10s" >> "$LOG"
else
  echo "[supervisor] FAIL pid=$NEW died within 10s — check $(ls -t /home/romel/hostamar-logs/cloudflared.log | head -1)" >> "$LOG"
fi
