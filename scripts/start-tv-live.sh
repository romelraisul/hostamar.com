#!/usr/bin/env bash
# Start TV station runtime: ffmpeg loop + tv-agent (podman container must already be up).
set -uo pipefail
cd /home/romel/hostamar-build

SECRET="$(grep -oP '(?<=^TV_AGENT_SECRET=).*' .tv-agent-secret.local | tr -d '\r\"')"
if [ -z "$SECRET" ]; then echo "NO SECRET in .tv-agent-secret.local"; exit 1; fi

# ffmpeg loop
if [ -f /tmp/ffmpeg.pid ] && kill -0 "$(cat /tmp/ffmpeg.pid)" 2>/dev/null; then
  echo "ffmpeg already running pid=$(cat /tmp/ffmpeg.pid)"
else
  nohup ffmpeg -re -stream_loop -1 -f concat -safe 0 \
    -i /home/romel/hostamar-build/docker/tv-station/videos/playlist.host.txt \
    -c:v libx264 -preset veryfast -b:v 2500k -maxrate 2500k -bufsize 5000k \
    -pix_fmt yuv420p -g 50 -c:a aac -b:a 128k -ar 44100 \
    -f flv rtmp://127.0.0.1:1935/live/tv > /tmp/ffmpeg.log 2>&1 &
  echo $! > /tmp/ffmpeg.pid
  echo "ffmpeg started pid=$(cat /tmp/ffmpeg.pid)"
fi

# tv-agent
cd /home/romel/hostamar-build/scripts/tv-agent
[ -d node_modules ] || npm install --no-audit --no-fund > /tmp/agent-install.log 2>&1
if [ -f /tmp/agent.pid ] && kill -0 "$(cat /tmp/agent.pid)" 2>/dev/null; then
  echo "agent already running pid=$(cat /tmp/agent.pid)"
else
  TV_AGENT_SECRET="$SECRET" HOSTAMAR_API="https://hostamar.com" \
    nohup node agent.js > /tmp/agent.log 2>&1 &
  echo $! > /tmp/agent.pid
  echo "agent started pid=$(cat /tmp/agent.pid)"
fi

sleep 3
echo "--- ffmpeg.log tail ---"
tail -5 /tmp/ffmpeg.log
echo "--- agent.log tail ---"
tail -8 /tmp/agent.log
