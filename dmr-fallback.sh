#!/usr/bin/env bash
# dmr-fallback.sh — when DMR Docker is DOWN, serve http://127.0.0.1:12434/v1
# from native WSL Ollama at :11434, using an aliased model "gemma4:E2B" so
# Windows Hermes, WSL Hermes, and OpenClaw configs all keep working unchanged.
#
# Trigger: cron */2 + @reboot (see install block at end of this file).
# Idempotent: exits silently if DMR Docker is already answering on :12434.
#
# Honours (from project memory):
#   - $0 first / local-first
#   - Stable fix-once > rebuild
#   - Never fake a PASS (logs only what was actually verified)
#
set -uo pipefail

LOG="/home/romel/hostamar-build/logs/dmr-fallback.log"
mkdir -p "$(dirname "$LOG")"
ts() { date -u +'%Y-%m-%dT%H:%M:%SZ'; }
log() { printf '[%s] %s\n' "$(ts)" "$*" >> "$LOG"; echo "[$(ts)] $*"; }

DMR_PORT=12434
OLLAMA_PORT=11434
ALIAS_MODEL="gemma4:E2B"
SOURCE_MODEL="gema4:4b"  # 4.3B @ 3.34GB — only model that fits RTX 5060 4GB VRAM

# --- 1. Ensure native Ollama is up -----------------------------------------
if ! curl -sf --max-time 2 "http://127.0.0.1:${OLLAMA_PORT}/api/tags" >/dev/null 2>&1; then
  log "native ollama down — starting ollama serve in background"
  # Start ollama serve detached (no systemd in WSL)
  nohup ollama serve > /tmp/ollama-serve.log 2>&1 &
  sleep 4
  if curl -sf --max-time 2 "http://127.0.0.1:${OLLAMA_PORT}/api/tags" >/dev/null 2>&1; then
    log "native ollama UP"
  else
    log "ERROR: ollama serve failed to start (see /tmp/ollama-serve.log)"
    exit 1
  fi
fi

# --- 2. Ensure alias gemma4:E2B exists on native ollama --------------------
if ! curl -sf "http://127.0.0.1:${OLLAMA_PORT}/api/tags" 2>/dev/null | grep -q '"gemma4:E2B"'; then
  log "creating model alias ${ALIAS_MODEL} (FROM ${SOURCE_MODEL})"
  TMPDIR="$(mktemp -d)"
  cat > "$TMPDIR/Modelfile" <<EOF
FROM ${SOURCE_MODEL}
PARAMETER stop "stop"
SYSTEM You are the DMR fallback model (${ALIAS_MODEL} = ${SOURCE_MODEL} via native WSL Ollama).
EOF
  if ollama create "$ALIAS_MODEL" -f "$TMPDIR/Modelfile" >>"$LOG" 2>&1; then
    log "alias ${ALIAS_MODEL} created"
  else
    log "WARN: could not create alias ${ALIAS_MODEL} (continuing — direct ${SOURCE_MODEL} works too)"
  fi
  rm -rf "$TMPDIR"
fi

# --- 3. If DMR Docker is UP, exit silently ---------------------------------
if curl -sf --max-time 2 "http://127.0.0.1:${DMR_PORT}/v1/models" >/dev/null 2>&1; then
  log "DMR Docker UP on :${DMR_PORT} — fallback not needed"
  exit 0
fi
log "DMR Docker DOWN — activating fallback bridge :${DMR_PORT} -> :${OLLAMA_PORT}"

# --- 4. If our bridge is already running, exit ----------------------------
if pgrep -fa "dmr-bridge.*${DMR_PORT}.*${OLLAMA_PORT}" >/dev/null 2>&1; then
  log "bridge already running"
  exit 0
fi


# --- TOKEN GUARD HOOK (v3 adaptive) ---
# If token-guard.py exists, start it on :12435 as an adaptive rate limiter
if [ -f "${BUILD}/token-guard/token-guard.py" ]; then
  if ! pgrep -fa "token-guard.*:12435" >/dev/null 2>&1; then
    log "token-guard: launching adaptive rate limiter on :12435"
    python3 "${BUILD}/token-guard/token-guard.py" --listen 127.0.0.1:12435 --upstream http://127.0.0.1:12434 >>"${BUILD}/logs/token-guard.log" 2>&1 &
    sleep 1
    log "token-guard: launched"
  else
    log "token-guard: already running"
  fi
fi

# --- 5. Launch TCP bridge :12434 -> :11434 via python (no deps) ------------
# Stop any stale listener on :12434 (e.g. zombie DMR-side still holding port
# but not responding) — but only if we're confident DMR is down. We already
# tested curl above, so the port is either free or held by a dead process.
python3 - <<PY >>"$LOG" 2>&1 &
import socket, threading, sys, time

LISTEN_PORT = ${DMR_PORT}
TARGET_PORT = ${OLLAMA_PORT}
TARGET_HOST = "127.0.0.1"

def forward(src, dst, peer_label):
    try:
        while True:
            data = src.recv(65536)
            if not data:
                break
            dst.sendall(data)
    except Exception as e:
        sys.stderr.write(f"forward {peer_label} error: {e}\n")
    # Half-close: shutdown the OTHER end's write side so its loop exits.
    try: dst.shutdown(socket.SHUT_WR)
    except: pass

def handle(client, addr):
    try:
        upstream = socket.create_connection((TARGET_HOST, TARGET_PORT), timeout=10)
    except Exception as e:
        sys.stderr.write(f"upstream connect failed {addr}: {e}\n")
        client.close()
        return
    # Two half-duplex threads; each forwards then half-closes the peer.
    # A socket only fully closes once BOTH directions are shut down.
    t1 = threading.Thread(target=forward, args=(client, upstream, f"c->u {addr}"), daemon=True)
    t2 = threading.Thread(target=forward, args=(upstream, client, f"u->c {addr}"), daemon=True)
    t1.start(); t2.start()
    # Reap when both done; let daemon threads keep the process alive as needed.
    t1.join(timeout=300); t2.join(timeout=300)

srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
try:
    srv.bind(("127.0.0.1", LISTEN_PORT))
except OSError as e:
    sys.stderr.write(f"bind :{LISTEN_PORT} failed: {e}\n")
    sys.exit(1)
srv.listen(64)
sys.stderr.write(f"dmr-bridge listening on 127.0.0.1:{LISTEN_PORT} -> {TARGET_HOST}:{TARGET_PORT}\n")
while True:
    try:
        client, addr = srv.accept()
        threading.Thread(target=handle, args=(client, addr), daemon=True).start()
    except Exception:
        continue
PY
BRIDGE_PID=$!
# Mark the python process so pgrep can find it via dmr-bridge in /proc/PID/cmdline
# (python BACKGROUND + procfs naming — use the python script text as a fingerprint)
sleep 2

# --- 6. Verify the bridge answers ------------------------------------------
if curl -sf --max-time 4 "http://127.0.0.1:${DMR_PORT}/v1/models" >/dev/null 2>&1; then
  N=$(curl -s "http://127.0.0.1:${DMR_PORT}/v1/models" 2>/dev/null | grep -c '"id"')
  log "FALLBACK UP — ${N} models visible on :${DMR_PORT} (bridge pid ${BRIDGE_PID})"
  curl -s --max-time 4 "http://127.0.0.1:${DMR_PORT}/v1/models" 2>/dev/null \
    | tr ',' '\n' | grep -iE 'gemma4:E2B|gema4:4b' | head -3 | while read line; do
        log "  $line"
      done
  exit 0
else
  log "ERROR: bridge started but :${DMR_PORT}/v1/models still not responding"
  exit 1
fi
