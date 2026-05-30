#!/bin/bash
# Hostamar Queue Processing - script mode (no LLM needed)
# Checks and processes video queue

cd /home/romelraisul/hostamar-local || exit 1

# Check main service
UP=$(curl -sf -o /dev/null -w "%{http_code}" http://localhost:3001/ 2>/dev/null)
if [ "$UP" != "200" ]; then
    echo "[SILENT]"
    exit 0
fi

# Check queue endpoint
QUEUE=$(curl -sf http://localhost:3001/api/video-queue 2>/dev/null)
QUEUE_EXIT=$?

if [ $QUEUE_EXIT -ne 0 ]; then
    echo "Queue API: unreachable (may not exist yet)"
    echo "Main service: UP on :3001"
    echo "No queue processing performed - API endpoint not responding"
    exit 0
fi

echo "Queue check: OK"
echo "$QUEUE" | head -100
