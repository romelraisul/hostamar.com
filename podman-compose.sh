#!/usr/bin/env bash
# podman-compose.sh — docker-or-podman compose wrapper.
# Use when docker daemon is down (Docker Desktop crashes / VWTray).
# Auto-fails to podman machine if installed.
set -uo pipefail
if docker ps >/dev/null 2>&1; then
  docker compose "$@"
else
  if ! command -v podman >/dev/null; then
    echo "podman not installed; run: sudo apt-get install -y podman podman-compose" >&2
    exit 127
  fi
  podman machine start hostamar 2>/dev/null || podman machine init hostamar --cpus 4 --memory 6144 --disk-size 80 2>/dev/null
  podman machine start hostamar 2>/dev/null
  podman compose "$@"
fi
