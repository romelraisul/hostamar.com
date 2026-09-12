#!/bin/bash
# local-worker-boot.sh — V9 Phase 1. Runs at Windows boot via Task Scheduler
# (setup-wsl-cron-persistent.bat, as root). Idempotent: ensures the local
# services the fleet depends on are up. Scheduling itself lives in Hermes
# cron + Vercel crons — this script does NOT loop forever (an unlogged
# infinite loop dies silently on reboot and hides failures; cron is visible,
# logged, and reported via FleetReport).
set -uo pipefail
LOG="/home/romel/hostamar-build/logs/local-worker-boot.log"
mkdir -p "$(dirname "$LOG")"
echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] boot: local worker start" >>"$LOG"
# cron daemon (systemd unit is enabled, but a fresh WSL instance needs it started)
(cron 2>/dev/null || service cron start 2>/dev/null || systemctl start cron 2>/dev/null) >>"$LOG" 2>&1
service cron status >>"$LOG" 2>&1 || true
# Brain :4000 — restart only if actually down (never touch ollama — V74 policy)
if ! curl -s --max-time 5 http://localhost:4000/v1/models >/dev/null 2>&1; then
  echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] boot: Brain :4000 down — restarting" >>"$LOG"
  bash /home/romel/hostamar-build/scripts/brain-restart.sh >>"$LOG" 2>&1 || true
else
  echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] boot: Brain :4000 up" >>"$LOG"
fi
echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] boot: done" >>"$LOG"
