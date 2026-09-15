#!/bin/bash
# local-runner/keepalive.sh — V86 Heavy Lifter PC-side registration + job handling every 5 min
# Persistent service — PC off safe — NO VERCEL CPU

set -e
WORKER_URL="https://hostamar-orchestrator.romelraisul.workers.dev"
PC_ID="hostamar-pc-primary"
LOG="/tmp/hostamar-keepalive.log"
WIN_PYTHON="/mnt/c/Users/User/AppData/Local/hermes/hermes-agent/venv/Scripts/python.exe"
BROWSER_VERIFY="/home/romel/hostamar-build/scripts/browser-login-verify.py"

echo "[$(date)] keepalive start" >> $LOG

run_once() {
  # 1. Register PC online
  curl -s -X POST $WORKER_URL/api/register -H "Content-Type: application/json" -d "{\"pcId\":\"$PC_ID\",\"ip\":\"$(hostname -I | awk '{print $1}')\"}" >> $LOG 2>&1 || true
  echo "[$(date)] registered pcOnline should be true" >> $LOG

  # 2. Verify browser login (pywinauto)
  if [ -f "$WIN_PYTHON" ]; then
    "$WIN_PYTHON" "$BROWSER_VERIFY" --json >> $LOG 2>&1 || true
    echo "[$(date)] browser verify done" >> $LOG
  fi

  # 3. Pull jobs
  JOBS=$(curl -s $WORKER_URL/api/queue/pull)
  echo "[$(date)] pulled jobs: $JOBS" >> $LOG

  # 4. Execute each job
  # NOTE: $JOBS and $job MUST be quoted — messages contain spaces; unquoted echo
  # splits the JSON and jq dies ("Invalid numeric literal"), which under set -e
  # killed the whole script before any job ever executed (the 2026-09-15 bug).
  echo "$JOBS" | jq -c '.[]' 2>/dev/null | while read -r job; do
    ID=$(echo "$job" | jq -r '.id' || true)
    TYPE=$(echo "$job" | jq -r '.type' || true)
    echo "[$(date)] executing $ID $TYPE" >> $LOG
    # execute-job.js reports its own status (done/failed) to the Worker;
    # only report a failure if the executor itself crashed before reporting.
    # absolute node path — cron PATH is /usr/local/bin:/usr/bin:/bin, node lives in ~/.local/bin
    if ! /home/romel/.local/bin/node /home/romel/hostamar-build/local-runner/execute-job.js "$job" >> $LOG 2>&1; then
      curl -s -X POST $WORKER_URL/api/queue/report -H "Content-Type: application/json" -d "{\"id\":\"$ID\",\"status\":\"failed\",\"result\":{\"ok\":false,\"error\":\"executor crashed\"}}" >> $LOG 2>&1 || true
    fi
  done

  # 5. Report every 5 min
  curl -s $WORKER_URL/api/status?since=0 | head -c 200 >> $LOG 2>&1 || true
}

run_once
# No `while true` / `sleep 300` here — crontab already fires this every 5 min.
# An in-script loop would pile up one immortal process per cron spawn.
