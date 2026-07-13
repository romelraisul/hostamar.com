#!/usr/bin/env bash
# =============================================================================
# video-pipeline/smoke-test.sh — GPU-host smoke test for the Hostamar video stack.
#
# RUN ON A GPU HOST (RunPod / Vast.ai A100-40GB or 2x RTX 4090). This box has no
# GPU, so this file is written-but-UNRUN here — verify on a GPU machine.
#
# It submits the REAL workflow JSONs (ttv.json / tts.json / full_pipeline.json)
# to the REAL ComfyUI endpoints wired in docker-compose.prod.yml:
#   COMFY_MAIN_URL (default :8188) -> LTX video
#   COMFY_LITE_URL (default :8189) -> Chatterbox TTS / ACE-Step / InfiniteTalk
#
# Usage:
#   COMFY_MAIN_URL=http://127.0.0.1:8188 COMFY_LITE_URL=http://127.0.0.1:8189 \
#     ./smoke-test.sh
# Smoke mode uses short durations to save GPU cost (real prod is 6x15s = 90s).
# =============================================================================
set -uo pipefail

MAIN_URL="${COMFY_MAIN_URL:-http://127.0.0.1:8188}"
LITE_URL="${COMFY_LITE_URL:-http://127.0.0.1:8189}"
WF_DIR="$(cd "$(dirname "$0")/workflows" && pwd)"
OUT_DIR="output"
REPORT="SMOKE_REPORT.md"
MODE="${SMOKE_MODE:-smoke}"   # smoke = short clips, saves cost
PASS=0; FAIL=0

mkdir -p "$OUT_DIR"
: > "$REPORT"
log() { echo "$1" | tee -a "$REPORT"; }

# ---- helpers ----------------------------------------------------------------
json_get() { python3 -c "import sys,json;print(json.load(sys.stdin)$1)" 2>/dev/null; }

poll_ready() {
  local url="$1" name="$2" i=0
  log "### $name health ($url/system_stats)"
  until curl -s -m 5 "$url/system_stats" | grep -q '"system"'; do
    i=$((i+1)); [ $i -ge 60 ] && { log "   FAIL: $name not ready after 5min"; return 1; }
    sleep 5
  done
  log "   OK: $name ready"; return 0
}

node_present() {
  # verify a custom node is loaded by querying ComfyUI's live node registry
  local url="$1" node="$2"
  curl -s -m 10 "$url/object_info" | python3 -c "import sys,json;d=json.load(sys.stdin);sys.exit(0 if '$node' in d else 1)" 2>/dev/null
}

submit_wait() {
  # submit a workflow JSON to one ComfyUI, poll /history, return output count
  local url="$1" wf="$2" cid="smoke-$$"
  local pid
  pid=$(curl -s -m 30 -X POST "$url/prompt" -H 'Content-Type: application/json' \
        -d "$(python3 -c "import json,sys;w=json.load(open('$wf'));w.setdefault('extra_data',{})['client_id']='$cid';print(json.dumps({'prompt':w,'client_id':'$cid'}))")" \
        | json_get "['prompt_id']")
  [ -z "$pid" ] && { log "   FAIL: submit returned no prompt_id"; return 1; }
  log "   submitted prompt_id=$pid"
  local i=0
  while [ $i -lt 360 ]; do
    local hist; hist=$(curl -s -m 10 "$url/history/$pid")
    if echo "$hist" | grep -q "\"$pid\""; then
      local n
      n=$(echo "$hist" | python3 -c "
import sys,json
d=json.load(sys.stdin)
h=d.get('$pid')
if not h: sys.exit(1)
outs=h.get('outputs',{})
print(sum(len(v.get('images',[])) for v in outs.values()))" 2>/dev/null)
      if [ -n "${n:-}" ]; then echo "$n"; return 0; fi
    fi
    sleep 5; i=$((i+1))
  done
  echo 0; return 1
}

# ---- 1. GPU ----
log "# GPU check"; echo "## GPU" >> "$REPORT"
if command -v nvidia-smi >/dev/null; then
  VRAM=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits | head -1)
  log "   nvidia-smi: ${VRAM} MB"
  if [ "${VRAM:-0}" -lt 24000 ]; then
    log "   WARN: <24GB VRAM. Use LTX GGUF Q6 fallback (see README)."
  fi
else
  log "   WARN: nvidia-smi not found (are you on the GPU host / inside container?)"
fi

# ---- 2. ComfyUI health ----
log "# ComfyUI health"
poll_ready "$MAIN_URL" "comfyui-main" && PASS=$((PASS+1)) || FAIL=$((FAIL+1))
poll_ready "$LITE_URL" "comfyui-lite" && PASS=$((PASS+1)) || FAIL=$((FAIL+1))

# ---- 3. custom nodes (live registry) ----
log "# Custom nodes (GET /object_info)"
for pair in "$MAIN_URL:LTXVModelLoader" "$LITE_URL:ChatterboxTTS" "$LITE_URL:ACEStepGenerate" "$LITE_URL:InfiniteTalkLipSync"; do
  url="${pair%%:*}"; node="${pair##*:}"
  if node_present "$url" "$node"; then log "   OK: $node loaded on $url"; PASS=$((PASS+1)); else log "   FAIL: $node missing on $url"; FAIL=$((FAIL+1)); fi
done

# ---- 4. models (filesystem, only if COMFY_ROOT mounted) ----
log "# Model weights"
if [ -n "${COMFY_ROOT:-}" ]; then
  for m in ltxv chatterbox ace_step wan infinitetalk upscale; do
    if [ -d "$COMFY_ROOT/models/$m" ] && [ -n "$(ls -A "$COMFY_ROOT/models/$m" 2>/dev/null)" ]; then
      log "   OK: models/$m present"; PASS=$((PASS+1))
    else
      log "   FAIL: models/$m empty/missing (run entrypoint.sh download)"; FAIL=$((FAIL+1))
    fi
  done
else
  log "   SKIP: set COMFY_ROOT=/path/to/ComfyUI to fs-check weights"
fi

# ---- 5. tests ----
log "# Test A — LTX T2V (main, short)"
A_OUT=$(submit_wait "$MAIN_URL" "$WF_DIR/ttv.json")
if [ "${A_OUT:-0}" -gt 0 ]; then log "   PASS: LTX produced $A_OUT output(s)"; PASS=$((PASS+1)); else log "   FAIL: LTX no output"; FAIL=$((FAIL+1)); fi

log "# Test B — Chatterbox Bangla TTS (lite)"
B_OUT=$(submit_wait "$LITE_URL" "$WF_DIR/tts.json")
if [ "${B_OUT:-0}" -gt 0 ]; then log "   PASS: TTS produced $B_OUT output(s)"; PASS=$((PASS+1)); else log "   FAIL: TTS no output"; FAIL=$((FAIL+1)); fi
log "   MANUAL: listen to the wav — Bangla quality is the UNVERIFIED part (transliteration + XTTS-v2 bn fallback)."

log "# Test C — full_pipeline template (single combined instance)"
if [ -n "${COMBINED_URL:-}" ]; then
  C_OUT=$(submit_wait "$COMBINED_URL" "$WF_DIR/full_pipeline.json")
  if [ "${C_OUT:-0}" -gt 0 ]; then log "   PASS: full pipeline $C_OUT output(s)"; PASS=$((PASS+1)); else log "   FAIL: full pipeline no output"; FAIL=$((FAIL+1)); fi
else
  log "   SKIP: set COMBINED_URL to an instance with ALL nodes for the end-to-end template."
  log "   (Production runs split: ttv.json->main, tts.json->lite, concat+4K in worker.py.)"
fi

# ---- 6. validation ----
log "# Output validation"
if command -v ffprobe >/dev/null && ls "$OUT_DIR"/*.mp4 >/dev/null 2>&1; then
  for f in "$OUT_DIR"/*.mp4; do
    log "   $(ffprobe -v error -select_streams v:0 -show_entries stream=width,height,codec_name -of csv=p=0 "$f") | $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")s | $(basename "$f")"
  done
else
  log "   (ffprobe missing or no mp4 yet — check $OUT_DIR manually)"
fi

# ---- summary ----
log ""
log "# RESULT  PASS=$PASS  FAIL=$FAIL"
if [ "$FAIL" -eq 0 ]; then
  log "ALL GREEN — flip video-pipeline/README 'UNVERIFIED' -> 'VERIFIED' and deploy."
else
  log "NOT READY — fix the FAIL items above before deploying."
fi
