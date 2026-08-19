#!/bin/bash
# NVIDIA Cloud Guard — permanent startup
# Ensures the Nvidia free-tier guard proxy is running on 127.0.0.1:12436
# Safe to call repeatedly (idempotent). Called from cron + hostamar permanent.sh
set -u

GUARD=/home/romel/hostamar-build/token-guard/nvidia-guard.py
LOG=/home/romel/hostamar-build/logs/nvidia-guard.log
ENV=/home/romel/.hermes/.env
PORT=12436

# Load NVIDIA_API_KEY
if [ -f "$ENV" ]; then
  # shellcheck disable=SC1090
  set -a; . "$ENV" 2>/dev/null; set +a
fi

# Already listening? done.
if ss -tln 2>/dev/null | grep -q ":${PORT} "; then
  exit 0
fi

# Kill any stale pid holding the port
pkill -f "nvidia-guard.py.*${PORT}" 2>/dev/null || true
sleep 1

if [ -z "${NVIDIA_API_KEY:-}" ]; then
  echo "$(date -Is) WARN: NVIDIA_API_KEY not loaded; proxy will not inject auth" >> "$LOG"
fi

cd /home/romel/hostamar-build || exit 1
setsid nohup python3 "$GUARD" --listen 127.0.0.1:${PORT} \
  --upstream https://integrate.api.nvidia.com \
  >> "$LOG" 2>&1 < /dev/null &
disown 2>/dev/null || true

# Verify it came up
sleep 2
if ss -tln 2>/dev/null | grep -q ":${PORT} "; then
  echo "$(date -Is) OK: nvidia-guard listening on ${PORT}" >> "$LOG"
  exit 0
else
  echo "$(date -Is) FAIL: nvidia-guard did not bind ${PORT}" >> "$LOG"
  exit 1
fi
