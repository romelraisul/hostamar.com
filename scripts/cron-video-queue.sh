#!/bin/bash
# Video queue processor cron - runs every 5 minutes
cd /home/romel/hostamar-build
node scripts/auto-ops.js --process-videos >> /home/romel/hostamar-build/logs/video-queue.log 2>&1
