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

while true; do
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
  echo "$JOBS" | jq -c '.[]' 2>/dev/null | while read job; do
    ID=$(echo $job | jq -r '.id')
    TYPE=$(echo $job | jq -r '.type')
    echo "[$(date)] executing $ID $TYPE" >> $LOG
    node /home/romel/hostamar-build/local-runner/execute-job.js "$job" >> $LOG 2>&1 || true
    curl -s -X POST $WORKER_URL/api/queue/report -H "Content-Type: application/json" -d "{\"id\":\"$ID\",\"status\":\"done\",\"result\":{\"ok\":true,\"type\":\"$TYPE\",\"time\":$(date +%s)}}" >> $LOG 2>&1 || true
  done

  # 5. Report every 5 min
  curl -s $WORKER_URL/api/status?since=0 | head -c 200 >> $LOG 2>&1 || true

  # Sleep 5 min
  sleep 300
done
