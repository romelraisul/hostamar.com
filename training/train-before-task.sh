#!/bin/bash
# train-before-task.sh - pre-task training trigger. Idempotent + honest.
# Usage: bash train-before-task.sh "<task>"
set -u
BUILD=/mnt/c/Users/User/hostamar-build
PY="$BUILD/.venv/bin/python"
TASK="${1:-general}"
echo "[$(date '+%F %T')] TRAIN BEFORE TASK: $TASK" >> "$BUILD/permanent.log"
# Keys come from env (never written to disk). If absent, the python script
# falls back to the local qwen3.6:27b teacher automatically.
"$PY" "$BUILD/training/train-permanent.py" "$TASK" >> "$BUILD/permanent.log" 2>&1
# Promote the freshly-trained alias over the base name for the 3 gema4 sizes.
for s in gema4:2b gema4:4b gema4:12b; do
  trained="${s}-trained"
  if ollama list 2>/dev/null | awk '{print $1}' | grep -qx "$trained"; then
    ollama cp "$trained" "$s" >> "$BUILD/permanent.log" 2>&1
    echo "[$(date '+%F %T')] promoted $trained -> $s" >> "$BUILD/permanent.log"
  fi
done
