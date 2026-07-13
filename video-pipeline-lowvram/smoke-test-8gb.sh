#!/usr/bin/env bash
# =============================================================================
# smoke-test-8gb.sh — LOW VRAM (8GB VRAM + 64GB RAM) smoke test.
#
# Runs SEQUENTIALLY (8GB cannot hold LTX + Wan at once). Frees VRAM via the
# ComfyUI /free endpoint between stages. 480p / 49 frames / 20 steps.
#
# UNVERIFIED on GPU-less boxes. Run on the 8GB host. Requires ComfyUI up:
#   docker compose -f docker-compose.lowvram.yml up -d
#   ./smoke-test.sh
# =============================================================================
set -uo pipefail
URL="${COMFY_URL:-http://127.0.0.1:8199}"
WF_DIR="$(cd "$(dirname "$0")/workflows/lowvram" && pwd)"
OUT_DIR="output"; mkdir -p "$OUT_DIR"
REPORT="SMOKE_REPORT_8GB.md"; : > "$REPORT"
RES="${RES:-512x768}"; FRAMES="${FRAMES:-49}"
PASS=0; FAIL=0
log() { echo "$1" | tee -a "$REPORT"; }

json_get() { python3 -c "import sys,json;print(json.load(sys.stdin)$1)" 2>/dev/null; }
node_present() { curl -s -m 10 "$URL/object_info" | python3 -c "import sys,json;d=json.load(sys.stdin);sys.exit(0 if '$1' in d else 1)" 2>/dev/null; }
free_vram() { curl -s -m 10 -X POST "$URL/free" >/dev/null 2>&1; sleep 8; }

poll_ready() {
  local i=0
  until curl -s -m 5 "$URL/system_stats" | grep -q '"system"'; do
    i=$((i+1)); [ $i -ge 80 ] && { log "FAIL: ComfyUI not ready"; return 1; }
    sleep 5
  done
  log "OK: ComfyUI ready"; return 0
}

submit_wait() {
  local wf="$1" cid="smoke8-$$"
  local pid
  pid=$(curl -s -m 30 -X POST "$URL/prompt" -H 'Content-Type: application/json' \
        -d "$(python3 -c "import json;w=json.load(open('$wf'));print(json.dumps({'prompt':w,'client_id':'$cid'}))")" \
        | json_get "['prompt_id']")
  [ -z "$pid" ] && { log "   FAIL: no prompt_id"; return 1; }
  local i=0
  while [ $i -lt 180 ]; do
    local hist; hist=$(curl -s -m 10 "$URL/history/$pid")
    if echo "$hist" | grep -q "\"$pid\""; then
      local n; n=$(echo "$hist" | python3 -c "
import sys,json
d=json.load(sys.stdin); h=d.get('$pid')
print(sum(len(v.get('images',[])) for v in h.get('outputs',{}).values())) if h else 0" 2>/dev/null)
      [ -n "${n:-}" ] && { echo "$n"; return 0; }
    fi
    sleep 5; i=$((i+1))
  done
  echo 0; return 1
}

log "# 8GB smoke test (RES=$RES FRAMES=$FRAMES)"
[ "$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits 2>/dev/null | head -1)" -lt 10000 ] \
  && log "GPU <=8GB detected — low VRAM mode correct" || log "WARN: GPU >8GB, still fine"

poll_ready || exit 1

# ---- node registry asserts (catch wrong titles BEFORE submit) ----
for n in UnetLoaderGGUF LTXMultiGPUChunkedNode WanVideoModelLoader InfiniteTalkMultiImage ChatterBoxSRTVoiceTTS; do
  if node_present "$n"; then log "OK: $n loaded"; else log "FAIL: $n MISSING (check node repo / title)"; FAIL=$((FAIL+1)); fi
done

# ---- Test A: LTX 2B GGUF ----
log "# Test A — LTX 2B GGUF (480p, 49 frames, 20 steps)"
A=$(submit_wait "$WF_DIR/ltx-2b-gguf-8gb.json")
[ "${A:-0}" -gt 0 ] && { log "PASS: LTX $A output(s)"; PASS=$((PASS+1)); } || { log "FAIL: LTX no output"; FAIL=$((FAIL+1)); }
free_vram

# ---- Test B: TTS ----
log "# Test B — Chatterbox Bangla TTS"
B=$(submit_wait "$WF_DIR/chatterbox-tts-8gb.json")
[ "${B:-0}" -gt 0 ] && { log "PASS: TTS $B output(s)"; PASS=$((PASS+1)); } || { log "FAIL: TTS no output"; FAIL=$((FAIL+1)); }
log "   MANUAL: listen — Bangla quality unverified (transliteration + XTTS bn fallback)."
free_vram

# ---- Test C: InfiniteTalk Q4 lip-sync ----
log "# Test C — InfiniteTalk Q4 (streaming, num_persistent 0)"
C=$(submit_wait "$WF_DIR/infinitetalk-q4-8gb.json")
[ "${C:-0}" -gt 0 ] && { log "PASS: lip-sync $C output(s)"; PASS=$((PASS+1)); } || { log "FAIL: lip-sync no output"; FAIL=$((FAIL+1)); }
free_vram

# ---- Test D: full 10s sequential (two-stage LTX) ----
log "# Test D — ltx-2.3-two-stage-8gb sequential"
D=$(submit_wait "$WF_DIR/ltx-2.3-two-stage-8gb.json")
[ "${D:-0}" -gt 0 ] && { log "PASS: full $D output(s)"; PASS=$((PASS+1)); } || { log "FAIL: full no output"; FAIL=$((FAIL+1)); }

# ---- validate ----
log "# Output validation"
if command -v ffprobe >/dev/null && ls "$OUT_DIR"/*.mp4 >/dev/null 2>&1; then
  for f in "$OUT_DIR"/*.mp4; do
    log "   $(ffprobe -v error -show_entries stream=width,height -of csv=p=0 "$f") $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")s $(basename "$f")"
  done
else
  log "   (ffprobe missing or no mp4 — check $OUT_DIR)"
fi

log "# RESULT PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ] && log "ALL GREEN (8GB) — file sizes/runtime still need a real 8GB run to confirm." \
                    || log "NOT READY — fix FAIL items."
