#!/usr/bin/env bash
# tv-channel-check.sh — monitor for the CHANNEL (TV Station Operator) employee.
#
# Deterministic, cheap, no LLM. The cron monitor hashes this output and only wakes
# the agent when it CHANGES, so it must emit STABLE bytes:
#   - no timestamps, no media-sequence (those advance every second by design and
#     would make every tick look "changed")
#   - cacheability is probed by fetching the SAME segment twice, because a first
#     fetch is always MISS for a brand-new live segment; only the second read
#     tells you whether the edge is actually caching.
REPO=/home/romel/hostamar.com
HLS=https://tv.hostamar.com/master.m3u8

# 1) the public HLS a viewer actually plays
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$HLS")
echo "hls_http=$code"
if [ "$code" = "200" ]; then
  # Use the FIRST segment, not the last: the newest one is still being written and
  # its cache state is erratic (MISS/HIT alternating), so probing it reports a
  # false "not caching" alarm. The oldest segment is settled and representative.
  seg=$(curl -s --max-time 20 "$HLS" | grep -E '\.(mp4|m4s|ts)$' | head -1)
  echo "seg_ext=${seg##*.}"
  # fetch twice; the second read tells the truth about edge caching
  curl -s -o /dev/null --max-time 20 "https://tv.hostamar.com/$seg"
  cache=$(curl -sI --max-time 20 "https://tv.hostamar.com/$seg" | grep -i cf-cache-status | tr -d '\r' | cut -d' ' -f2)
  echo "edge_cache_2nd=$cache"
fi

# 2) units that make the channel
for u in tv-ffmpeg tv-ffmpeg-vp9 tv-rtmp tv-hls2 tv-tunnel restream tv-agent; do
  echo "unit_${u}=$(systemctl --user is-active $u 2>/dev/null)"
done

# 3) YouTube egress: 2+ pushers on one key makes YouTube refuse to start
echo "youtube_pushers=$(ps -eo cmd --no-headers | grep -c '[y]outube.com/live2')"
live=$(curl -sL --max-time 25 -A 'Mozilla/5.0' \
  "https://www.youtube.com/channel/UCEbTau5-kjqIVexOwL9C3dQ/live" 2>/dev/null \
  | grep -oE '"videoId":"[A-Za-z0-9_-]{11}"' | head -1 | sed 's/.*:"//;s/"//')
echo "youtube_video=$live"
if [ -n "$live" ]; then
  curl -sL --max-time 25 -A 'Mozilla/5.0' "https://www.youtube.com/watch?v=$live" 2>/dev/null \
    | grep -q '"isLiveNow":true' && echo "youtube_live=yes" || echo "youtube_live=no"
fi

# 4) what can play with the PC OFF (edge-served, git-tracked mp4s)
echo "edge_videos=$(cd $REPO 2>/dev/null && git ls-files 'public/tv/*.mp4' 2>/dev/null | wc -l)"
[ -s "$REPO/docker/tv-station/videos/loop.mp4" ] && echo "loop_present=yes" || echo "loop_present=no"
echo "playlist_items=$(grep -c '^file ' $REPO/docker/tv-station/videos/playlist.host.txt 2>/dev/null)"

# 5) did the last CHANNEL shift leave uncommitted TV work? (shelf growth stalls
#    silently if a shift edits files but never pushes)
echo "tv_dirty=$(cd $REPO 2>/dev/null && git status --porcelain -- app/tv public/tv scripts/tv 2>/dev/null | wc -l)"
