#!/bin/bash
# health_check_auto_heal.sh — TV HLS 404 auto-heal (recurring corrupt-render guard).
#
# Runs via systemd timer (tv-health-check.timer) every 60s, OR cron.
# On HLS 404/stall: regenerate playlist skipping unplayable files (defense in
# depth from commit 8270e0b), force-restart ffmpeg, notify Telegram.
#
# Won't thrash: if HLS already 200, just logs OK and exits.
set -u

REPO="/home/romel/hostamar-build"
HLS_URL="https://tv.hostamar.com/hls/tv/index.m3u8"
LOG="/tmp/tv-health-check.log"
PLAYLIST="$REPO/docker/tv-station/videos/playlist.host.txt"
TELEGRAM_BOT_TOKEN="${HOSTAMAR_TV_TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${HOSTAMAR_TV_TELEGRAM_CHAT_ID:-}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"; }

check_hls() {
  # Returns 0 if HLS returns a valid m3u8 with content
  curl -sf --max-time 10 "$HLS_URL" 2>/dev/null | head -5 | grep -q "#EXTM3U"
}

heal() {
  log "HLS not 200 — healing..."

  # Find unplayable entries in the playlist and drop them (corrupt 0-byte / moov-missing).
  python3 - <<'PY'
import os, glob, subprocess
REPO="/home/romel/hostamar-build"
PLAYLIST=os.path.join(REPO,"docker/tv-station/videos/playlist.host.txt")
VIRAL=os.path.join(REPO,"docker/tv-station/videos/viral")
def playable(p):
    if not os.path.exists(p) or os.path.getsize(p)==0:
        return False
    try:
        r=subprocess.run(["ffprobe","-v","error","-show_entries","format=duration",
                          "-of","csv=p=0",p],capture_output=True,text=True,timeout=10)
        if r.returncode!=0: return False
        d=r.stdout.strip()
        return d and float(d)>4.8
    except Exception:
        return False
# Only prune corrupt entries, keep valid ones + preserve order.
kept=[]
pruned=0
if os.path.exists(PLAYLIST):
    for line in open(PLAYLIST):
        line=line.strip()
        if not line.startswith("file '"): continue
        p=line[6:-1]
        if playable(p):
            kept.append(line)
        else:
            pruned+=1
            print(f"[heal] pruning unplayable: {p}")
    tmp=PLAYLIST+".tmp"
    open(tmp,"w").write("\n".join(kept)+("\n" if kept else ""))
    os.rename(tmp,PLAYLIST)
    print(f"[heal] kept {len(kept)}, pruned {pruned}")
PY

  # Force-restart ffmpeg so it picks up the cleaned playlist.
  python3 "$REPO/scripts/tv/force_restart.py" >> "$LOG" 2>&1 || true
  sleep 4

  if check_hls; then
    log "HLS RECOVERED 200 after heal"
    [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ] && \
      curl -s -m 10 "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=TV+HLS+auto-healed+from+404+at+$(date '+%H:%M')" >/dev/null 2>&1 || true
  else
    log "HLS STILL 404 after heal — manual intervention needed"
    [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ] && \
      curl -s -m 10 "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=TV+HLS+STILL+404+after+auto-heal" >/dev/null 2>&1 || true
  fi
}

# Main
if check_hls; then
  log "HLS 200 OK"
else
  heal
fi
