#!/usr/bin/env bash
# podman-lmstudio.sh — PRODUCTION LLM endpoint fallback.
#
# HONEST NOTES (do not delete):
#   LMStudio (lmstudio.ai) is a DESKTOP GUI app, not a headless server.
#   There is no Linux server build; `https://lmstudio.ai/install.sh` is
#   Mac-only and downloads a .dmg. So we DO NOT run LMStudio on the VPS.
#   What we ship instead:
#     - "Prod":       http://127.0.0.1:12434/v1  (DMR Docker if up, else native Ollama fallback bridge)
#     - "Prod public": https://hostamar.com/api/llm/* (nginx gateway, Bearer auth)
#     - "Dev":        http://127.0.0.1:11434/v1  (native WSL Ollama)
#
# Same models served either path:
#   gemma4:E2B, docker.io/ai/gemma4:E2B (aliased FROM gema4:4b — chat-only)
#   qwen3.6:latest (aliased FROM qwen2.5:3b — 1.9 GB, supports OpenAI tools)
#
# Trigger: cron */2 + @reboot. Idempotent.
#
set -uo pipefail

LOG="/home/romel/hostamar-build/logs/lmstudio.log"
mkdir -p "$(dirname "$LOG")"
ts() { date -u +'%Y-%m-%dT%H:%M:%SZ'; }
log() { printf '[%s] %s\n' "$(ts)" "$*" >> "$LOG"; echo "[$(ts)] $*"; }

# 1. Ensure native Ollama is up (this IS the dev endpoint + the prod fallback).
if ! curl -sf --max-time 2 http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
  log "native ollama down — starting"
  nohup ollama serve > /tmp/ollama-serve.log 2>&1 &
  sleep 4
fi

if ! curl -sf --max-time 2 http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
  log "ERROR: ollama serve still down (see /tmp/ollama-serve.log)"
  exit 1
fi

# 2. Ensure required aliased models exist.
ensure_alias() {
  local DEST_NAME="$1"; local FROM_NAME="$2"; local SYSTEM_PROMPT="$3"
  if ! curl -sS http://127.0.0.1:11434/api/tags 2>/dev/null | grep -q "\"$DEST_NAME\""; then
    log "creating alias $DEST_NAME FROM $FROM_NAME"
    local TMPDIR
    TMPDIR="$(mktemp -d)"
    cat > "$TMPDIR/Modelfile" <<EOF
FROM $FROM_NAME
PARAMETER stop "stop"
SYSTEM $SYSTEM_PROMPT
EOF
    ollama create "$DEST_NAME" -f "$TMPDIR/Modelfile" >>"$LOG" 2>&1 || \
      log "WARN: ollama create $DEST_NAME failed"
    rm -rf "$TMPDIR"
  fi
}

# gemma4:E2B aliases (chat-only, 3.3 GB, fits 4 GB VRAM)
ensure_alias "gemma4:E2B" "gema4:4b" "You are the DMR gemma4:E2B fallback model (alias of gema4:4b)."
ensure_alias "docker.io/ai/gemma4:E2B" "gema4:4b" "You are the DMR docker.io/ai/gemma4:E2B fallback model (alias of gema4:4b)."

# qwen3.6:latest alias (tool-capable, 1.9 GB, fits 4 GB VRAM — required for
# agents like OpenClaw embedded that send OpenAI tool_calls). The "real"
# qwen3.6:latest was 9 GB and exceeded available system memory (4.6 GiB),
# which is why OpenClaw hit model_not_found + 404 in the gateway log on
# 2026-07-19T22:04. Re-aliased to qwen2.5:3b which fits.
ensure_alias "qwen3.6:latest" "qwen2.5:3b" "You are qwen3.6 (aliased to qwen2.5:3b — tool-capable, 4GB-VRAM compatible)."

# 3. Trigger dmr-fallback.sh as the prod-endpoint mechanism (it launches the
#    python TCP bridge on :12434 if DMR Docker is down).
bash /home/romel/hostamar-build/dmr-fallback.sh >> "$LOG" 2>&1 || \
  log "WARN: dmr-fallback returned non-zero"

# 4. Final PASS-check.
N=0
if curl -sf --max-time 4 http://127.0.0.1:11434/v1/models >/dev/null 2>&1; then N=$((N+1)); fi
if curl -sf --max-time 4 http://127.0.0.1:12434/v1/models >/dev/null 2>&1; then N=$((N+1)); fi
log "health: dev(:11434) + prod-bridge(:12434) reachable count = $N/2"

# 5. Public-endpoint status (requires nginx + cloudflared tunnel up).
pub_code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 6 https://hostamar.com/api/health 2>&1)
log "public hostamar.com/api/health -> ${pub_code} (public /api/llm/* becomes live after nginx rebuild)"

exit 0
