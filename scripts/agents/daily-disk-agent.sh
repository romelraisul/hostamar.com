#!/bin/bash
# Daily autonomous disk agent (WSL side) — 2026-11-05 kilocode.
# Runs 4x/day via daily-disk-agent.timer. The Windows Task Scheduler companion
# (HostamarDailyDiskAgent) truncates root-owned logs, cleans the host temp and
# compacts the WSL VHDX so space freed here actually reaches C:.
# Never deletes live data: only dangling volumes, caches, and logs.
#
# Log: /home/romel/.hermes/logs/daily-disk-agent.log
log() { echo "[$(date '+%F %T')] $*" >> /home/romel/.hermes/logs/daily-disk-agent.log; }
C_FREE() { powershell.exe -Command "[math]::Round((Get-PSDrive C).Free/1GB,1)" 2>/dev/null | tr -d '\r\n' | tail -1; }
WSL_FREE() { df --output=avail -BG / | tail -1 | tr -dc "0-9"; }

mkdir -p /home/romel/.hermes/logs /home/romel/.hermes/cache
log "=== daily disk agent start (WSL) ==="
log "before: WSL free=$(WSL_FREE)G  C: free=$(C_FREE)G"

# 1. Unused docker volumes — the biggest WSL-side lever (~34GB observed).
#    prune --volumes removes DANGLING volumes only; in-use ones (postgres,
#    coolify, medusa, openobserve, teldrive, redis, freellmapi) are attached.
if command -v docker >/dev/null 2>&1; then
  out=$(docker system prune -f --volumes 2>/dev/null | grep -i "reclaimed" | tail -1)
  log "docker prune: ${out:-done} (volumes left: $(docker volume ls -q 2>/dev/null | wc -l))"
fi
if command -v podman >/dev/null 2>&1; then
  podman volume prune -f >/dev/null 2>&1
  log "podman volume prune: done"
fi

# 2. Build caches that regrow daily (rebuilt on demand — safe).
rm -rf /home/romel/hostamar.com/.next/cache 2>/dev/null
rm -rf /home/romel/.npm/_cacache /home/romel/.cache/pnpm /home/romel/.cache/uv \
       /home/romel/.cache/pip /home/romel/.gradle/caches 2>/dev/null
find /home/romel/.hermes/cache -type f -delete 2>/dev/null
find /home/romel/.cache -type f -atime +7 -delete 2>/dev/null
log "caches cleared (pnpm store is the Windows pass' job)"

# 3. Journal vacuum; root-owned syslog/kern.log are truncated by the Windows pass.
journalctl --user --vacuum-time=3d >>/home/romel/.hermes/logs/daily-disk-agent.log 2>&1 || true
syslog_size=$(stat -c '%s' /var/log/syslog 2>/dev/null || echo 0)
log "journal vacuumed (syslog now $((syslog_size/1024/1024))M — root truncate runs in the Windows pass)"

# 4. fstrim so freed blocks are returnable to the VHDX by the Windows compaction.
fstrim -a -v >>/home/romel/.hermes/logs/daily-disk-agent.log 2>&1 || true
log "fstrim done (WSL free=$(WSL_FREE)G)"

# 5. Slack summary — one line every run, louder below the C: threshold.
C=$(C_FREE)
SLACK_WEBHOOK_URL=$(grep -h -oE '^SLACK_WEBHOOK_URL=.*' /home/romel/automation/infisical.env /home/romel/.hermes/.env 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d '\r\n')
export SLACK_WEBHOOK_URL
if [ -z "$SLACK_WEBHOOK_URL" ]; then
  log "NOTE: Slack alerts off - add SLACK_WEBHOOK_URL=https://hooks.slack.com/... to /home/romel/automation/infisical.env"
else
  BIG="ComfyUI/models ~241G (re-downloadable HF), OneDrive 85G (Free up space), Pagefile 41.9G (cap 8G), hostamar-build 34G"
  if [ -n "$C" ] && [ "$C" != "0" ] && awk "BEGIN{exit !($C < 10)}"; then
    node /home/romel/hostamar.com/scripts/notify-slack.mjs \
      "WARN disk: C: ${C}G free (<10G). Daily agent ran, WSL free $(WSL_FREE)G. Levers left: $BIG" \
      >>/home/romel/.hermes/logs/daily-disk-agent.log 2>&1 || true
  else
    node /home/romel/hostamar.com/scripts/notify-slack.mjs \
      "Daily disk agent: WSL free $(WSL_FREE)G, C: free ${C:-?}G (caches+volumes+journal trimmed, fstrim done)" \
      >>/home/romel/.hermes/logs/daily-disk-agent.log 2>&1 || true
  fi
fi
log "=== daily disk agent done (C: free=$C) ==="
