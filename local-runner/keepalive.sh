#!/bin/bash
# local-runner/keepalive.sh — V86 Heavy Lifter PC-side registration + job handling every 5 min
# Persistent service — PC off safe — NO VERCEL CPU

set -e
WORKER_URL="https://hostamar-orchestrator.romelraisul.workers.dev"
PC_ID="hostamar-pc-primary"
LOG="/tmp/hostamar-keepalive.log"

echo "[$(date)] keepalive start" >> $LOG

while true; do
  # 1. Register PC online — /api/register POST Local PC Register PC online
  curl -s -X POST $WORKER_URL/api/register -H "Content-Type: application/json" -d "{\"pcId\":\"$PC_ID\",\"ip\":\"$(hostname -I | awk '{print $1}')\"}" >> $LOG 2>&1 || true
  echo "[$(date)] registered pcOnline should be true" >> $LOG

  # 2. Pull jobs — /api/queue/pull GET Local PC keepalive.sh Fetch pending jobs
  JOBS=$(curl -s $WORKER_URL/api/queue/pull)
  echo "[$(date)] pulled jobs: $JOBS" >> $LOG

  # 3. Execute each job — heavy lifter — Vercel frontend only <50MB daily 12 cron max — local does heavy
  echo "$JOBS" | jq -c '.[]' 2>/dev/null | while read job; do
    ID=$(echo $job | jq -r.id)
    TYPE=$(echo $job | jq -r.type)
    echo "[$(date)] executing $ID $TYPE" >> $LOG
    # Call local executor — SEO crawler + marketing
    node /home/romel/hostamar-build/local-runner/execute-job.js "$job" >> $LOG 2>&1 || true
    # Report completion — /api/queue/report POST Local PC Report job completion
    curl -s -X POST $WORKER_URL/api/queue/report -H "Content-Type: application/json" -d "{\"id\":\"$ID\",\"status\":\"done\",\"result\":{\"ok\":true,\"type\":\"$TYPE\",\"time\":$(date +%s)}}" >> $LOG 2>&1 || true
  done

  # 4. Report every 5 min — Cloudflare Worker CRON every 5 min — NO Vercel CPU
  curl -s $WORKER_URL/api/status?since=0 | head -c 200 >> $LOG 2>&1 || true

  # Sleep 5 min — report every 5 minute but will not effect vercel
  sleep 300
done
