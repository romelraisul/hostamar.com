#!/usr/bin/env bash
# start-low-io.sh — minimal IO boot. NO video/brave/comfyui.
# Use when disk is hot (>90% C:) — bring up ONLY router + Ollama (local fallback)
# and let the cloud models take the rest of the load. Idempotent.
set -uo pipefail
BUILD="/home/romel/hostamar-build"

# 1) WSL caps FIRST. We need .wslconfig to apply BEFORE Docker starts VM.
# (only writes if missing — does not overwrite existing settings)
if [ ! -f "$HOME/.wslconfig" ]; then
  {
    echo ""
    echo "memory=4GB"
    echo "processors=2"
    echo "swap=0"
    echo ""
  } > "$HOME/.wslconfig"
  echo "Wrote ~/.wslconfig caps. Run 'wsl --shutdown' and re-enter for them to apply."
fi

# 2) Stop wasting IO — kill heavy containers (video/brave/comfyui)
for c in hostamar-video hostamar-browser-api hostamar-brave \
         hostamar-ltx-video hostamar-opencut hostamar-comfyui-lowvram \
         hostamar-openclaw; do
  docker rm -f "$c" >/dev/null 2>&1 || true
done

# 3) Bring up ONLY the router
"$BUILD/permanent.sh"

# 4) Report
echo "--- Low-IO state ---"
df -h / /mnt/c | head -3
docker ps --format "{{.Names}} {{.Status}}" | head -10
echo
echo "cached windows task snapshot: not directly accessible from WSL."
echo "Use the disk-guard.sh cron (every 15 min) to monitor + auto-prune."
