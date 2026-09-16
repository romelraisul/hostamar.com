#!/usr/bin/env bash
# tv-shift-pulse.sh — monitor for CHANNEL, the TV Station Operator.
#
# WHY THIS IS NOT JUST A HEALTH CHECK:
# A pure health monitor would suppress the agent every time the channel is
# healthy — and then the SEO/new-video work the owner asked for would never run.
# So this puts a slow-moving "shift gate" alongside the health lines:
#
#   shift_pending=yes   -> less than 4h since the last productive shift, OR the
#                          edge shelf is stale -> the agent works.
#   shift_pending=no    -> covered recently and nothing is broken -> stay quiet.
#
# This makes CHANNEL wake roughly every few hours (and instantly on any break),
# without spamming a run every 15 minutes. The bucket changes only at shift
# boundaries, so the output is stable tick-to-tick and the gate actually holds.
REPO=/home/romel/hostamar-build
HLS=https://tv.hostamar.com/master.m3u8
STATE=$HOME/.hermes/state/tv-channel-shift

# --- health (any change here must wake the agent immediately) ---------------
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$HLS")
echo "hls_http=$code"
if [ "$code" = "200" ]; then
  seg=$(curl -s --max-time 20 "$HLS" | grep -E '\.(mp4|m4s|ts)$' | head -1)
  echo "seg_ext=${seg##*.}"
  # Probe init.mp4 (the EXT-X-MAP target), not a segment: segment names rotate out
  # of the ~30s playlist window, so probing one flaps HIT/MISS tick to tick and the
  # changing hash would wake the agent every 15 minutes. init.mp4's name is fixed
  # and every viewer fetches it.
  #
  # Query string busts nothing but forces a fresh edge lookup; the FIRST read after
  # an origin restart is MISS and later reads are HIT, so read twice and report the
  # settled value. One MISS alone is not evidence of broken caching.
  curl -s -o /dev/null --max-time 20 "https://tv.hostamar.com/init.mp4"
  c1=$(curl -sI --max-time 20 "https://tv.hostamar.com/init.mp4" | grep -i cf-cache-status | tr -d '\r' | cut -d' ' -f2)
  [ "$c1" = "HIT" ] || c1=$(curl -sI --max-time 20 "https://tv.hostamar.com/init.mp4" | grep -i cf-cache-status | tr -d '\r' | cut -d' ' -f2)
  echo "edge_cache=$c1"
fi
for u in tv-ffmpeg tv-ffmpeg-vp9 tv-rtmp tv-hls2 tv-tunnel restream tv-agent; do
  echo "unit_${u}=$(systemctl --user is-active $u 2>/dev/null)"
done
# 2+ pushers on one key makes YouTube refuse to start the broadcast
echo "youtube_pushers=$(ps -eo cmd --no-headers | grep -c '[y]outube.com/live2')"
live=$(curl -sL --max-time 25 -A 'Mozilla/5.0' \
  "https://www.youtube.com/channel/UCEbTau5-kjqIVexOwL9C3dQ/live" 2>/dev/null \
  | grep -oE '"videoId":"[A-Za-z0-9_-]{11}"' | head -1 | sed 's/.*:"//;s/"//')
echo "youtube_video=$live"
if [ -n "$live" ]; then
  # The channel's /live URL keeps returning the LAST broadcast's videoId even
  # after it ends, so "is there an id" is NOT "are we live". Read the id's own
  # isLiveNow, and treat a network/parse failure as unknown rather than as live
  # (this probe once reported live=yes with zero pushers, i.e. a false green).
  body=$(curl -sL --max-time 25 -A 'Mozilla/5.0' "https://www.youtube.com/watch?v=$live" 2>/dev/null)
  if printf '%s' "$body" | grep -q '"isLiveNow":true'; then
    echo "youtube_live=yes"
  elif printf '%s' "$body" | grep -q '"isLiveNow":false'; then
    echo "youtube_live=no"
  else
    echo "youtube_live=unknown"
  fi
fi
echo "edge_videos=$(cd $REPO 2>/dev/null && git ls-files 'public/tv/*.mp4' 2>/dev/null | wc -l)"
[ -s "$REPO/docker/tv-station/videos/loop.mp4" ] && echo "loop_present=yes" || echo "loop_present=no"
# uncommitted TV work means a shift edited but never pushed (shelf growth stalls)
echo "tv_dirty=$(cd $REPO 2>/dev/null && git status --porcelain -- app/tv public/tv scripts/tv 2>/dev/null | wc -l)"

# --- shift gate -------------------------------------------------------------
# The token is written by THIS script, not by the agent. If the agent had to
# stamp it, forgetting would reopen the gate and fire every 15 minutes forever —
# burning tokens for no work. Here the gate opens once per SHIFT_HOURS and closes
# itself immediately, so a healthy channel wakes the agent roughly every 4h.
# A BREAK still wakes it instantly and regardless of the timer: the health lines
# above change the output hash, which is what the monitor actually compares.
mkdir -p "$(dirname "$STATE")"
now=$(date +%s)
last=0
[ -f "$STATE" ] && last=$(cat "$STATE" 2>/dev/null || echo 0)
case "$last" in ''|*[!0-9]*) last=0;; esac
SHIFT_HOURS=4
if [ $(( now - last )) -ge $(( SHIFT_HOURS * 3600 )) ]; then
  echo "shift_pending=yes"
  printf '%s' "$now" > "$STATE"   # consume the shift now; no agent dependency
else
  echo "shift_pending=no"
fi
# NOTE: deliberately no "age" value here. An age that ticks hourly would change
# the output hash every hour and wake the agent hourly, defeating the gate.
