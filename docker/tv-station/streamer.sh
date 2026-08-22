#!/bin/sh
# ═══════════════════════════════════════════════════════════════
# Hostamar TV auto-streamer
# Polls the Hostamar API. When the channel is live, builds an ffmpeg
# command that loops the playlist to every active RTMP destination.
# ═══════════════════════════════════════════════════════════════
set -e

API="${HOSTAMAR_API:-https://hostamar.com}"
POLL="${POLL_SECONDS:-30}"
PLAYLIST_DIR="/tv"
FFMPEG_PID=""

echo "[tv-streamer] starting. API=$API poll=${POLL}s"

# Build a local concat playlist file from the API playlist items.
build_playlist() {
  mkdir -p "$PLAYLIST_DIR"
  LIST="$PLAYLIST_DIR/playlist.txt"
  : > "$LIST"
  # Fetch playlist JSON, extract urls (jq-free: grep/sed)
  URLS=$(wget -qO- "$API/api/tv/playlist" 2>/dev/null | sed 's/},{/}\n{/g' | grep -o '"url":"[^"]*"' | sed 's/"url":"//;s/"$//')
  COUNT=0
  for u in $URLS; do
    # Only include absolute http(s) URLs that ffmpeg can read
    case "$u" in
      http://*|https://*) echo "file '$u'" >> "$LIST"; COUNT=$((COUNT+1));;
    esac
  done
  echo "$COUNT"
}

# Fetch active destinations and start ffmpeg to all of them.
start_stream() {
  DEST_JSON=$(wget -qO- -O /dev/null --server-response "$API/api/tv/destinations" 2>/dev/null || true)
  # destinations endpoint is admin-only; the streamer relies on the start
  # response which embeds the ffmpeg command. Fall back to env destinations.
  ARGS=""
  [ -n "$YOUTUBE_RTMP_URL" ] && [ -n "$YOUTUBE_STREAM_KEY" ] && ARGS="$ARGS -f flv $YOUTUBE_RTMP_URL/$YOUTUBE_STREAM_KEY"
  [ -n "$FACEBOOK_RTMP_URL" ] && [ -n "$FACEBOOK_STREAM_KEY" ] && ARGS="$ARGS -f flv $FACEBOOK_RTMP_URL/$FACEBOOK_STREAM_KEY"
  [ -n "$TWITCH_RTMP_URL" ] && [ -n "$TWITCH_STREAM_KEY" ] && ARGS="$ARGS -f flv $TWITCH_RTMP_URL/$TWITCH_STREAM_KEY"
  # Local RTMP (nginx-rtmp) always as a loopback target for the HLS player
  ARGS="$ARGS -f flv ${LOCAL_RTMP:-rtmp://rtmp:1935/live}/tv"

  if [ -z "$ARGS" ]; then
    echo "[tv-streamer] no destinations configured; skipping ffmpeg"
    return 1
  fi

  COUNT=$(build_playlist)
  if [ "$COUNT" = "0" ]; then
    echo "[tv-streamer] playlist empty; skipping ffmpeg"
    return 1
  fi

  echo "[tv-streamer] streaming $COUNT items to destinations"
  ffmpeg -re -stream_loop -1 -f concat -safe 0 -i "$PLAYLIST_DIR/playlist.txt" \
    -c:v libx264 -preset veryfast -b:v 2500k -maxrate 2500k -bufsize 5000k \
    -pix_fmt yuv420p -g 50 -c:a aac -b:a 128k -ar 44100 \
    $ARGS &
  FFMPEG_PID=$!
  echo "[tv-streamer] ffmpeg pid=$FFMPEG_PID"
}

stop_stream() {
  if [ -n "$FFMPEG_PID" ] && kill -0 "$FFMPEG_PID" 2>/dev/null; then
    echo "[tv-streamer] stopping ffmpeg pid=$FFMPEG_PID"
    kill "$FFMPEG_PID" 2>/dev/null || true
    wait "$FFMPEG_PID" 2>/dev/null || true
  fi
  FFMPEG_PID=""
}

LIVE=""
while true; do
  STATUS=$(wget -qO- "$API/api/tv/status" 2>/dev/null || echo '{}')
  ISLIVE=$(echo "$STATUS" | grep -o '"isLive":[a-z]*' | sed 's/"isLive"://')

  if [ "$ISLIVE" = "true" ] && [ -z "$LIVE" ]; then
    LIVE=1
    start_stream || LIVE=""
  elif [ "$ISLIVE" != "true" ] && [ -n "$LIVE" ]; then
    LIVE=""
    stop_stream
  fi

  # Restart ffmpeg if it died while still live
  if [ -n "$LIVE" ] && [ -n "$FFMPEG_PID" ] && ! kill -0 "$FFMPEG_PID" 2>/dev/null; then
    echo "[tv-streamer] ffmpeg died; restarting"
    FFMPEG_PID=""
    start_stream || true
  fi

  sleep "$POLL"
done
