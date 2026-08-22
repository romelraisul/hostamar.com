#!/bin/bash
# podman-compose.sh - permanent docker-or-podman compose wrapper.
# Honors the principle "NEVER break existing builds": if docker is up,
# use docker; ELSE try podman (start the hostamar machine on the fly).
# Exits with the same non-zero code the underlying compose emits.
#
# Usage: bash podman-compose.sh <compose-file> <up|down|...> [extra args...]
set -u

COMPOSE_FILE="${1:-}"
ACTION="${2:-up}"
shift 2 || true
EXTRA_ARGS=("$@")

if [ -z "$COMPOSE_FILE" ]; then
  echo "usage: podman-compose.sh <compose-file> <up|down|...>" >&2
  exit 64
fi

# 1) Prefer docker if its daemon answers.
if docker info >/dev/null 2>&1; then
  COMPOSE="docker compose"
else
  echo "[podman-compose] docker daemon not responding -> falling back to podman"
  if ! command -v podman >/dev/null 2>&1; then
    echo "[podman-compose] podman NOT installed on this box; install with:" >&2
    echo "    sudo apt-get install -y podman  (or winget via Windows PowerShell)" >&2
    exit 127
  fi
  COMPOSE="podman compose"
  # Start the hostamar machine if it exists + isn't running.
  if podman machine list 2>/dev/null | grep -q hostamar; then
    if ! podman machine inspect hostamar 2>/dev/null | grep -q '"Running": true'; then
      podman machine start hostamar >/dev/null 2>&1 || \
        echo "[podman-compose] podman machine start hostamar failed - continuing"
    fi
  fi
fi

# 2) Run the requested compose command, propagating exit code.
$COMPOSE -f "$COMPOSE_FILE" "$ACTION" "${EXTRA_ARGS[@]}"
rc=$?
exit $rc
