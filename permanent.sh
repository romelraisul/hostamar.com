#!/bin/bash
# permanent.sh - Hostamar local-only model stack boot/repair + full pipeline.
# Called by @reboot crontab. Idempotent. NEVER breaks existing builds.
# 2026-07-18 update: podman fallback, 6-repo full AI pipeline (additive).
set -u
BUILD=/mnt/c/Users/User/hostamar-build
LOG="$BUILD/permanent.log"
ts="$(date '+%Y-%m-%d %H:%M:%S')"
echo "[$ts] permanent.sh start" >> "$LOG"

# --- 0) Container engine preference: docker primary, podman fallback. ----
docker_up=1
if ! docker info >/dev/null 2>&1; then
  docker_up=0
  echo "[$ts] docker daemon not responding" >> "$LOG"
  if command -v podman >/dev/null 2>&1; then
    if podman machine list 2>/dev/null | grep -q hostamar; then
      echo "[$ts] starting podman machine hostamar" >> "$LOG"
      podman machine start hostamar >> "$LOG" 2>&1 || true
    fi
  else
    echo "[$ts] podman NOT installed - install via: sudo apt-get install -y podman" >> "$LOG"
  fi
fi

# Compose helper: prefer docker compose, fall back to podman compose.
if [ "$docker_up" = "1" ]; then
  COMPOSE_DEL=("docker" "compose")
else
  COMPOSE_DEL=("podman" "compose")
fi

# --- 1) Ollama up (WSL binary). -----------------------------------------
if ! curl -s --max-time 3 http://localhost:11434/api/tags >/dev/null 2>&1; then
  echo "[$ts] ollama down -> starting 'ollama serve'" >> "$LOG"
  nohup ollama serve >/tmp/ollama.log 2>&1 &
  for i in $(seq 1 30); do
    curl -s --max-time 3 http://localhost:11434/api/tags >/dev/null 2>&1 && break
    sleep 2
  done
fi

# --- 2) Pull bases if missing (idempotent), then cp aliases. -----------
ensure_base() {
  # ensure_base <base-tag> <alias>
  local base="$1" alias="$2"
  ollama list 2>/dev/null | awk '{print $1}' | grep -qE "^${alias}(:latest\$|\$)" && return 0
  ollama list 2>/dev/null | awk '{print $1}' | grep -qE "^${base}(:latest\$|\$)" \
    || { ollama pull "$base" >> "$LOG" 2>&1 || return 1; }
  ollama cp "$base" "$alias" >> "$LOG" 2>&1
}

ensure_base gemma3:1b            gema4:2b
ensure_base gemma3:4b            gema4:4b
ensure_base gemma3:12b           gema4:12b
ensure_base gemma3:12b           gemma4-12b-code
ensure_base codegemma:7b         gema4-code:12b
ensure_base qwen2.5-coder:14b    qwen3.6
ensure_base qwen2.5-coder:14b    qwen3.6:27b

# --- 3) Router (litellm-play) - recreate only if missing/stopped. ------
if [ "$docker_up" = "1" ]; then
  LOOKUP="docker ps --format '{{.Names}}'"
else
  LOOKUP="podman ps --format '{{.Names}}'"
fi
if ! eval "$LOOKUP" | grep -qx litellm-play; then
  echo "[$ts] litellm-play not running -> recreate" >> "$LOG"
  if [ "$docker_up" = "1" ]; then
    docker rm -f litellm-play >/dev/null 2>&1
    docker run -d --name litellm-play \
      -p 4000:4000 \
      -v "$BUILD/litellm-config.final.yaml:/tmp/cfg.yaml:ro" \
      -v "$BUILD/token_guard_per_sec.py:/tmp/token_guard_per_sec.py:ro" \
      -e PYTHONPATH=/tmp \
      -e NVIDIA_API_KEY=placeholder -e KILOCODE_API_KEY=placeholder \
      -e KILOCODE_API_KEY_1=placeholder -e KILOCODE_API_KEY_2=placeholder \
      --add-host host.docker.internal:host-gateway \
      ghcr.io/berriai/litellm:main-latest \
      --config /tmp/cfg.yaml --port 4000 --detailed_debug >> "$LOG" 2>&1
  else
    podman rm -f litellm-play >/dev/null 2>&1 || true
    podman run -d --name litellm-play \
      -p 4000:4000 \
      -v "$BUILD/litellm-config.final.yaml:/tmp/cfg.yaml:ro" \
      -v "$BUILD/token_guard_per_sec.py:/tmp/token_guard_per_sec.py:ro" \
      -e PYTHONPATH=/tmp \
      -e NVIDIA_API_KEY=placeholder -e KILOCODE_API_KEY=placeholder \
      -e KILOCODE_API_KEY_1=placeholder -e KILOCODE_API_KEY_2=placeholder \
      --add-host host.docker.internal:host-gateway \
      ghcr.io/berriai/litellm:main-latest \
      --config /tmp/cfg.yaml --port 4000 >> "$LOG" 2>&1
  fi
  sleep 8
fi

# --- 4) Other hostamar compose services --------------------------------
# Single-service compose files (up first; podman fallback if docker down).
for entry in "video:hostamar-video:docker-compose.video.yml" \
             "brave:hostamar-browser-api:docker-compose.brave.yml" \
             "openclaw:hostamar-openclaw:docker-compose.openclaw.yml"; do
  IFS=: read label name yml <<< "$entry"
  if ! eval "$LOOKUP" | grep -qx "$name"; then
    echo "[$ts] $name not running -> compose $yml up -d" >> "$LOG"
    ( cd "$BUILD" && "${COMPOSE_DEL[@]}" -f "$yml" up -d >> "$LOG" 2>&1 ) || true
  fi
done

# --- 4b) Full 6-repo AI pipeline (docker-compose.full.yml) -------------
# Best-effort: if a build fails (torch wheels on flaky link / OOM) we log
# the failure and continue - do NOT crash the whole boot. DRIFT is honest.
for name in hostamar-ltx-video hostamar-chatterbox \
            hostamar-ace-step hostamar-infinitetalk hostamar-opencut; do
  if ! eval "$LOOKUP" | grep -qx "$name"; then
    echo "[$ts] $name not running -> compose -f docker-compose.full.yml up -d --build" >> "$LOG"
    ( cd "$BUILD" && "${COMPOSE_DEL[@]}" -f docker-compose.full.yml up -d --build "$name" >> "$LOG" 2>&1 ) \
      || echo "[$ts] $name build/up FAILED (drift OK on free-tier)" >> "$LOG"
  fi
done

# --- 5) Verify all locks (drift -> audit log) --------------------------
if [ -x "$BUILD/verify-locked.sh" ]; then
  "$BUILD/verify-locked.sh" >> "$LOG" 2>&1 || true
  # Auto-heal lightly: if model aliases still missing, recurse one pass.
  if [ "$?" -ne 0 ]; then
    echo "[$ts] drift after first verify; running create-gema4-aliases.sh" >> "$LOG"
    [ -x "$BUILD/create-gema4-aliases.sh" ] && bash "$BUILD/create-gema4-aliases.sh" >> "$LOG" 2>&1 || true
    "$BUILD/verify-locked.sh" >> "$LOG" 2>&1 || true
  fi
fi

# --- 6) rclone copyright-db backup (best-effort) ----------------------
command -v rclone >/dev/null 2>&1 && rclone copy "$BUILD/copyright-db" onedrive:Hostamar/permanent --quiet 2>>"$LOG" || true

# --- 7) Daily training loop (hy3 online else qwen3.6:27b offline) ----
# Uses .venv python (openai installed via uv). Keys from env only.
if [ -x "$BUILD/training/train-before-task.sh" ]; then
  echo "[$ts] daily train -> train-before-task.sh" >> "$LOG"
  bash "$BUILD/training/train-before-task.sh" "daily permanent training" >> "$LOG" 2>&1 || true
fi

echo "[$ts] permanent.sh done" >> "$LOG"
