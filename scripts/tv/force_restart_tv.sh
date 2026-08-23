#!/bin/bash
# FORCE restart tv-ffmpeg so the new playlist (new video first) actually loads.
# 1. pkill any stray ffmpeg streaming to rtmp (service will auto-restart via Restart=always)
# 2. systemctl restart to be sure
# 3. wait, then verify new PID holds the NEW first playlist file open
set -u
PLAYLIST=/home/romel/hostamar-build/docker/tv-station/videos/playlist.host.txt
FIRST=$(head -1 "$PLAYLIST" | sed "s/^file '//; s/'$//")
echo "target first file: $FIRST"

pkill -f "rtmp://127.0.0.1:1935/live/tv" 2>/dev/null
sleep 2
systemctl --user restart tv-ffmpeg
sleep 8

PID=$(pgrep -f "rtmp://127.0.0.1:1935/live/tv" | head -1)
echo "NEW PID=$PID etime=$(ps -o etime= -p "$PID" 2>/dev/null)"
OPEN=$(ls -l /proc/$PID/fd 2>/dev/null | grep -oE "/home/[^ ]*videos/[^ ]*" | head -2)
echo "open fds: $OPEN"
echo "$FIRST" | grep -q "$(basename "$(echo "$OPEN" | head -1)")" && echo "FD MATCHES NEW FIRST FILE ✓" || echo "FD MISMATCH (concat may have moved on) — check below"
echo
echo "--- playlist head ---"
head -2 "$PLAYLIST"
